using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Infrastructure;

public static class PaymentEnrollmentHelper
{
    public static async Task CompletePendingPaymentAsync(
        AppDbContext context,
        int paymentId,
        ILogger? logger,
        CancellationToken cancellationToken = default)
    {
        var payment = await context.Payments
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return;
        }

        if (payment.Status == "completed")
        {
            return;
        }

        var course = payment.Course;
        var now = DateTime.UtcNow;
        payment.Status = "completed";
        payment.PaidAt = now;
        if (string.IsNullOrWhiteSpace(payment.TransactionId))
        {
            payment.TransactionId = $"PAY-{payment.Id:N0}-{now:yyyyMMddHHmmss}";
        }

        if (string.IsNullOrWhiteSpace(payment.ReceiptUrl))
        {
            payment.ReceiptUrl = $"/api/payments/{payment.Id}/status";
        }

        var learning = await context.Learnings.FirstOrDefaultAsync(
            x => x.AccountId == payment.AccountId && x.CourseId == course.Id,
            cancellationToken);
        if (learning is null)
        {
            context.Learnings.Add(new LearningModel
            {
                AccountId = payment.AccountId,
                CourseId = course.Id,
                Progress = 0,
                LastAccessed = now,
                AccessExpiresAtUtc = CourseAccessRules.ComputeAccessExpiryUtc(now, course),
            });
            course.Students += 1;
        }
        else
        {
            learning.AccessExpiresAtUtc = CourseAccessRules.ComputeAccessExpiryUtc(now, course);
            learning.LastAccessed = now;
        }

        await context.SaveChangesAsync(cancellationToken);
        logger?.LogInformation("Платёж {PaymentId} завершён, курс {CourseId}", payment.Id, course.Id);
    }
}
