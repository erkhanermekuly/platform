using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Infrastructure;
using Stripe;
using Stripe.Checkout;

namespace server.Controllers;

[Route("api/payments/webhook")]
[ApiController]
[AllowAnonymous]
public class PaymentsWebhookController(
    AppDbContext context,
    IConfiguration configuration,
    ILogger<PaymentsWebhookController> logger) : ControllerBase
{
    /// <summary>Stripe Checkout: после успешной оплаты помечаем платёж и открываем доступ к курсу.</summary>
    [HttpPost("stripe")]
    public async Task<IActionResult> StripeHook(CancellationToken cancellationToken)
    {
        var secret = configuration["Payments:Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return NotFound();
        }

        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        var stripeSignature = Request.Headers["Stripe-Signature"].ToString();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, secret, throwOnApiVersionMismatch: false);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Stripe webhook: проверка подписи не удалась");
            return BadRequest();
        }

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted &&
            stripeEvent.Data.Object is Session session)
        {
            if (session.PaymentStatus != "paid")
            {
                return Ok();
            }

            if (!int.TryParse(session.ClientReferenceId, out var paymentId))
            {
                logger.LogWarning("Stripe session без client_reference_id (payment id)");
                return Ok();
            }

            StripeConfiguration.ApiKey = configuration["Payments:Stripe:SecretKey"] ?? string.Empty;

            await PaymentEnrollmentHelper.CompletePendingPaymentAsync(context, paymentId, logger, cancellationToken);
        }

        return Ok();
    }
}
