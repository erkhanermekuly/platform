using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using System.Security.Claims;

namespace server.Controllers;

[Route("api/payments")]
[ApiController]
[Authorize]
public class PaymentsController(AppDbContext context) : ControllerBase
{
    [HttpPost("process")]
    public async Task<IActionResult> Process([FromBody] ProcessPaymentDto dto)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var course = await context.Courses.FindAsync(dto.CourseId);
        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var payment = new PaymentModel
        {
            AccountId = userId.Value,
            CourseId = course.Id,
            Amount = dto.Amount ?? course.Price,
            Status = "completed",
            Provider = "kaspi",
            TransactionId = $"KSP-{Guid.NewGuid():N}"[..16],
            CreatedAt = DateTime.UtcNow,
            PaidAt = DateTime.UtcNow
        };

        context.Payments.Add(payment);

        var learning = await context.Learnings.FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == course.Id);
        if (learning is null)
        {
            context.Learnings.Add(new LearningModel
            {
                AccountId = userId.Value,
                CourseId = course.Id,
                Progress = 0,
                LastAccessed = DateTime.UtcNow
            });
            course.Students += 1;
            course.IsLocked = false;
        }

        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            paymentStatus = payment.Status,
            transactionId = payment.TransactionId,
            courseId = course.Id,
            amount = payment.Amount,
            paidAt = payment.PaidAt
        }, "Платеж успешно обработан"));
    }

    [HttpGet("{paymentId:int}/status")]
    public async Task<IActionResult> Status(int paymentId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var payment = await context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.AccountId == userId);

        if (payment is null)
        {
            return NotFound(ApiResponse.Error("Платеж не найден"));
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            status = payment.Status,
            transactionId = payment.TransactionId,
            amount = payment.Amount,
            createdAt = payment.CreatedAt,
            paidAt = payment.PaidAt
        }));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
