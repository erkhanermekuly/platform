using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Infrastructure;
using server.Models;
using Stripe.Checkout;
using System.Security.Claims;
using System.Text.Json;

namespace server.Controllers;

[Route("api/payments")]
[ApiController]
public class PaymentsController(AppDbContext context, UrkerPaymentService urkerPaymentService) : ControllerBase
{
    [Authorize]
    [HttpPost("process")]
    public async Task<IActionResult> Process([FromBody] ProcessPaymentDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var course = await context.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == dto.CourseId);
        if (course is null || !course.IsPublished)
        {
            return NotFound(ApiResponse.Error("Курс не найден или недоступен"));
        }

        if (course.Price <= 0)
        {
            return BadRequest(ApiResponse.Error("Курс бесплатный — запишитесь через «Записаться»."));
        }

        var hasPaid = await context.Payments.AnyAsync(p =>
            p.AccountId == userId && p.CourseId == course.Id && p.Status == "completed");
        if (hasPaid)
        {
            return BadRequest(ApiResponse.Error("Оплата по этому курсу уже зафиксирована."));
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
            transactionId = urkerResponse.TransactionId ?? payment.TransactionId,
            courseId = course.Id,
            amount = payment.Amount,
            paidAt = payment.PaidAt
        }, "Платеж успешно обработан"));
    }

    [Authorize]
    [HttpGet("{paymentId:int}/status")]
    public async Task<IActionResult> Status(int paymentId, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var payment = await context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.AccountId == userId, cancellationToken);

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
            paidAt = payment.PaidAt,
            receiptUrl = payment.ReceiptUrl,
            provider = payment.Provider,
        }));
    }

    [AllowAnonymous]
    [HttpGet("webhook/urker")]
    [HttpPost("webhook/urker")]
    public async Task<IActionResult> UrkerWebhook([FromQuery] UrkerPaymentWebhookDto queryDto, [FromBody] UrkerPaymentWebhookDto? bodyDto, CancellationToken cancellationToken)
    {
        var dto = bodyDto ?? queryDto;
        if (!IsWebhookAuthorized(dto))
        {
            return Unauthorized(ApiResponse.Error("Некорректный секрет webhook"));
        }

        var payment = await ResolvePaymentAsync(dto, cancellationToken);
        if (payment is null)
        {
            return NotFound(ApiResponse.Error("Платеж не найден"));
        }

        if (payment.Status != "completed")
        {
            await CompletePaymentAsync(payment, dto, cancellationToken);
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            status = payment.Status
        }, "Платеж подтвержден"));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }

    private bool IsWebhookAuthorized(UrkerPaymentWebhookDto dto)
    {
        var headerSecret = Request.Headers["X-Urker-Webhook-Secret"].FirstOrDefault();
        var secret = string.IsNullOrWhiteSpace(headerSecret) ? dto.Secret : headerSecret;

        return !string.IsNullOrWhiteSpace(secret) && secret == urkerPaymentService.GetWebhookSecret();
    }

    private async Task<PaymentModel?> ResolvePaymentAsync(UrkerPaymentWebhookDto dto, CancellationToken cancellationToken)
    {
        if (int.TryParse(dto.LocalPaymentId, out var localPaymentId))
        {
            return await context.Payments
                .Include(x => x.Course)
                .FirstOrDefaultAsync(x => x.Id == localPaymentId, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(dto.PaymentId))
        {
            return await context.Payments
                .Include(x => x.Course)
                .FirstOrDefaultAsync(x => x.TransactionId == dto.PaymentId, cancellationToken);
        }

        if (dto.AccountId.HasValue && dto.CourseId.HasValue)
        {
            return await context.Payments
                .Include(x => x.Course)
                .FirstOrDefaultAsync(x => x.AccountId == dto.AccountId.Value && x.CourseId == dto.CourseId.Value, cancellationToken);
        }

        return null;
    }

    private async Task CompletePaymentAsync(PaymentModel payment, UrkerPaymentWebhookDto dto, CancellationToken cancellationToken)
    {
        payment.Status = "completed";
        payment.Provider = "kaspi-urker";
        payment.PaidAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.PaymentId))
        {
            payment.TransactionId = dto.PaymentId;
        }

        if (!string.IsNullOrWhiteSpace(dto.TransactionId))
        {
            payment.TransactionId = dto.TransactionId;
        }

        var learning = await context.Learnings
            .FirstOrDefaultAsync(x => x.AccountId == payment.AccountId && x.CourseId == payment.CourseId, cancellationToken);

        if (learning is null)
        {
            context.Learnings.Add(new LearningModel
            {
                AccountId = payment.AccountId,
                CourseId = payment.CourseId,
                Progress = 0,
                LastAccessed = DateTime.UtcNow
            });

            if (payment.Course is not null)
            {
                payment.Course.Students += 1;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }
}
