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
                Detail = a.Olympiad.Title,
                Status = a.IsVoided ? "voided" : "completed",
                Score = (int?)a.ScorePercent,
                At = a.SubmittedAtUtc,
            })
            .ToListAsync();

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
