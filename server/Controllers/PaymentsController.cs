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
[Authorize]
public class PaymentsController(AppDbContext context, IConfiguration configuration, ILogger<PaymentsController> logger) : ControllerBase
{
    private string PaymentMode => (configuration["Payments:Mode"] ?? "instant").Trim().ToLowerInvariant();

    private bool StripeConfigured =>
        !string.IsNullOrWhiteSpace(configuration["Payments:Stripe:SecretKey"]);

    /// <summary>История платежей текущего пользователя.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> MyHistory([FromQuery] int take = 50)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        take = Math.Clamp(take, 1, 200);
        var rows = await context.Payments
            .AsNoTracking()
            .Where(p => p.AccountId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .Select(p => new
            {
                p.Id,
                p.CourseId,
                courseTitle = p.Course.Title,
                p.Amount,
                p.Status,
                p.Provider,
                p.TransactionId,
                p.ExternalId,
                p.ReceiptUrl,
                p.CreatedAt,
                p.PaidAt,
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(rows));
    }

    /// <summary>Создать платёж и получить ссылку на оплату (Stripe) или id для подтверждения stub.</summary>
    [HttpPost("init")]
    public async Task<IActionResult> Init([FromBody] ProcessPaymentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

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

        var amount = dto.Amount ?? course.Price;
        var payment = new PaymentModel
        {
            AccountId = userId.Value,
            CourseId = course.Id,
            Amount = amount,
            Status = "pending",
            Provider = "pending",
            TransactionId = string.Empty,
            CreatedAt = DateTime.UtcNow,
        };
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var mode = PaymentMode;
        if (mode == "stripe" && StripeConfigured)
        {
            Stripe.StripeConfiguration.ApiKey = configuration["Payments:Stripe:SecretKey"];
            var successUrl = configuration["Payments:Stripe:SuccessUrl"] ?? "http://localhost:5173/profile?payment=ok";
            var cancelUrl = configuration["Payments:Stripe:CancelUrl"] ?? "http://localhost:5173/courses";

            var options = new SessionCreateOptions
            {
                Mode = "payment",
                SuccessUrl = successUrl.Contains('?', StringComparison.Ordinal) ? $"{successUrl}&session_id={{CHECKOUT_SESSION_ID}}" : $"{successUrl}?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = cancelUrl,
                ClientReferenceId = payment.Id.ToString(),
                LineItems =
                [
                    new SessionLineItemOptions
                    {
                        Quantity = 1,
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = (configuration["Payments:Stripe:Currency"] ?? "kzt").ToLowerInvariant(),
                            UnitAmount = (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero),
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = course.Title,
                            },
                        },
                    },
                ],
                Metadata = new Dictionary<string, string>
                {
                    ["paymentId"] = payment.Id.ToString(),
                    ["courseId"] = course.Id.ToString(),
                    ["accountId"] = userId.Value.ToString(),
                },
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options);
            payment.Provider = "stripe";
            payment.ExternalId = session.Id;
            payment.MetadataJson = JsonSerializer.Serialize(new { session.Id });
            await context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                paymentId = payment.Id,
                mode = "stripe",
                checkoutUrl = session.Url,
            }));
        }

        payment.Provider = "stub";
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            mode = "stub",
            checkoutUrl = (string?)null,
        }));
    }

    /// <summary>Завершить тестовый платёж (режим stub, только для разработки / явной настройки).</summary>
    [HttpPost("stub/complete")]
    public async Task<IActionResult> StubComplete([FromBody] PaymentStubCompleteDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        if (PaymentMode != "stub" && PaymentMode != "instant")
        {
            return BadRequest(ApiResponse.Error("Режим stub недоступен."));
        }

        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var payment = await context.Payments
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.Id == dto.PaymentId && p.AccountId == userId);
        if (payment is null)
        {
            return NotFound(ApiResponse.Error("Платёж не найден"));
        }

        if (payment.Status == "completed")
        {
            return Ok(ApiResponse<object>.Ok(new { paymentId = payment.Id, paymentStatus = payment.Status }, "Уже оплачено"));
        }

        await PaymentEnrollmentHelper.CompletePendingPaymentAsync(context, payment.Id, logger);
        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            paymentStatus = payment.Status,
            transactionId = payment.TransactionId,
            courseId = payment.CourseId,
            amount = payment.Amount,
            paidAt = payment.PaidAt,
            receiptUrl = payment.ReceiptUrl,
        }, "Платеж успешно обработан"));
    }

    /// <summary>Устаревший мгновенный платёж: в режиме instant создаёт и сразу завершает запись (как раньше).</summary>
    [HttpPost("process")]
    public async Task<IActionResult> Process([FromBody] ProcessPaymentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        if (PaymentMode == "stripe" && StripeConfigured)
        {
            return BadRequest(ApiResponse.Error("Используйте POST /api/payments/init и оплату через Stripe."));
        }

        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var course = await context.Courses.FirstOrDefaultAsync(c => c.Id == dto.CourseId);
        if (course is null || !course.IsPublished)
        {
            return NotFound(ApiResponse.Error("Курс не найден или недоступен"));
        }

        var amount = dto.Amount ?? course.Price;
        var payment = new PaymentModel
        {
            AccountId = userId.Value,
            CourseId = course.Id,
            Amount = amount,
            Status = "pending",
            Provider = PaymentMode == "stub" ? "stub" : "kaspi",
            TransactionId = string.Empty,
            CreatedAt = DateTime.UtcNow,
        };
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        await PaymentEnrollmentHelper.CompletePendingPaymentAsync(context, payment.Id, logger);

        return Ok(ApiResponse<object>.Ok(new
        {
            paymentId = payment.Id,
            paymentStatus = payment.Status,
            transactionId = payment.TransactionId,
            courseId = course.Id,
            amount = payment.Amount,
            paidAt = payment.PaidAt,
            receiptUrl = payment.ReceiptUrl,
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
            paidAt = payment.PaidAt,
            receiptUrl = payment.ReceiptUrl,
            provider = payment.Provider,
        }));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
