using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using System.Security.Claims;

namespace server.Controllers;

/// <summary>Лента событий для UI (оплаты, олимпиады).</summary>
[Route("api/notifications")]
[ApiController]
[Authorize]
public class NotificationsController(AppDbContext context) : ControllerBase
{
    [HttpGet("recent")]
    public async Task<IActionResult> Recent([FromQuery] int take = 12)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        take = Math.Clamp(take, 1, 50);

        var payments = await context.Payments
            .AsNoTracking()
            .Where(p => p.AccountId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .Select(p => new
            {
                p.Id,
                Detail = p.Course.Title,
                p.Status,
                Amount = (decimal?)p.Amount,
                At = p.PaidAt ?? p.CreatedAt,
                p.ReceiptUrl,
            })
            .ToListAsync();

        var olympiads = await context.OlympiadAttempts
            .AsNoTracking()
            .Where(a => a.AccountId == userId)
            .OrderByDescending(a => a.SubmittedAtUtc)
            .Take(take)
            .Select(a => new
            {
                a.Id,
                Detail = a.Olympiad != null ? a.Olympiad.Title : "",
                Status = a.IsVoided ? "voided" : "completed",
                Score = (int?)a.ScorePercent,
                At = a.SubmittedAtUtc,
            })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var accessRows = await context.Learnings
            .AsNoTracking()
            .Where(x => x.AccountId == userId && x.AccessExpiresAtUtc != null)
            .Select(x => new
            {
                x.Id,
                x.CourseId,
                CourseTitle = x.Course.Title,
                x.AccessExpiresAtUtc,
            })
            .ToListAsync();

        var accessNotifications = accessRows
            .Where(x =>
            {
                var exp = x.AccessExpiresAtUtc!.Value;
                var days = (exp - now).TotalDays;
                return days is >= 0 and <= 14 || (days < 0 && days >= -7);
            })
            .Select(x =>
            {
                var exp = x.AccessExpiresAtUtc!.Value;
                var expired = exp < now;
                return new
                {
                    type = "access",
                    id = x.Id,
                    title = "Доступ к курсу",
                    detail = x.CourseTitle,
                    status = expired ? "expired" : "expiring",
                    amount = (decimal?)null,
                    scorePercent = (int?)null,
                    at = exp,
                    receiptUrl = (string?)null,
                    courseId = (int?)x.CourseId,
                    accessExpiresAtUtc = (DateTime?)exp,
                };
            })
            .ToList();

        var items = payments
            .Select(p => new
            {
                type = "payment",
                id = p.Id,
                title = "Платёж",
                detail = p.Detail,
                status = p.Status,
                amount = p.Amount,
                scorePercent = (int?)null,
                at = p.At,
                receiptUrl = p.ReceiptUrl,
                courseId = (int?)null,
                accessExpiresAtUtc = (DateTime?)null,
            })
            .Concat(olympiads.Select(o => new
            {
                type = "olympiad",
                id = o.Id,
                title = "Олимпиада",
                detail = o.Detail,
                status = o.Status,
                amount = (decimal?)null,
                scorePercent = o.Score,
                at = o.At,
                receiptUrl = (string?)null,
                courseId = (int?)null,
                accessExpiresAtUtc = (DateTime?)null,
            }))
            .Concat(accessNotifications.Select(a => new
            {
                a.type,
                a.id,
                a.title,
                a.detail,
                a.status,
                a.amount,
                a.scorePercent,
                at = a.at,
                a.receiptUrl,
                a.courseId,
                a.accessExpiresAtUtc,
            }))
            .OrderByDescending(x => x.at)
            .Take(take)
            .ToList();

        return Ok(ApiResponse<object>.Ok(items));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
