using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server;

namespace server.Controllers;

[Route("api/admin/exports")]
[ApiController]
[Authorize(Roles = "admin")]
public class AdminExportsController(AppDbContext context) : ControllerBase
{
    [HttpGet("payments.csv")]
    public async Task<IActionResult> ExportPayments(CancellationToken cancellationToken)
    {
        var rows = await context.Payments
            .AsNoTracking()
            .Include(p => p.Account)
            .Include(p => p.Course)
            .OrderByDescending(p => p.Id)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.Append('\uFEFF');
        sb.AppendLine(string.Join(',', new[]
        {
            Csv("Id"),
            Csv("AccountId"),
            Csv("Email"),
            Csv("CourseId"),
            Csv("CourseTitle"),
            Csv("Amount"),
            Csv("Status"),
            Csv("Provider"),
            Csv("TransactionId"),
            Csv("ExternalId"),
            Csv("CreatedAtUtc"),
            Csv("PaidAtUtc"),
            Csv("ReceiptUrl"),
        }));

        foreach (var p in rows)
        {
            sb.AppendLine(string.Join(',', new[]
            {
                Csv(p.Id.ToString(CultureInfo.InvariantCulture)),
                Csv(p.AccountId.ToString(CultureInfo.InvariantCulture)),
                Csv(p.Account.Email),
                Csv(p.CourseId.ToString(CultureInfo.InvariantCulture)),
                Csv(p.Course.Title),
                Csv(p.Amount.ToString(CultureInfo.InvariantCulture)),
                Csv(p.Status),
                Csv(p.Provider),
                Csv(p.TransactionId),
                Csv(p.ExternalId),
                Csv(p.CreatedAt.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture)),
                Csv(p.PaidAt?.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture)),
                Csv(p.ReceiptUrl),
            }));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv; charset=utf-8", $"payments-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    [HttpGet("olympiad-attempts.csv")]
    public async Task<IActionResult> ExportOlympiadAttempts(CancellationToken cancellationToken)
    {
        var rows = await context.OlympiadAttempts
            .AsNoTracking()
            .Include(a => a.Account)
            .Include(a => a.Olympiad)
            .OrderByDescending(a => a.Id)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.Append('\uFEFF');
        sb.AppendLine(string.Join(',', new[]
        {
            Csv("Id"),
            Csv("AccountId"),
            Csv("Email"),
            Csv("OlympiadId"),
            Csv("OlympiadTitle"),
            Csv("TotalQuestions"),
            Csv("CorrectCount"),
            Csv("ScorePercent"),
            Csv("BonusPoints"),
            Csv("IsVoided"),
            Csv("SubmittedAtUtc"),
        }));

        foreach (var a in rows)
        {
            sb.AppendLine(string.Join(',', new[]
            {
                Csv(a.Id.ToString(CultureInfo.InvariantCulture)),
                Csv(a.AccountId.ToString(CultureInfo.InvariantCulture)),
                Csv(a.Account?.Email),
                Csv(a.OlympiadId.ToString(CultureInfo.InvariantCulture)),
                Csv(a.Olympiad?.Title),
                Csv(a.TotalQuestions.ToString(CultureInfo.InvariantCulture)),
                Csv(a.CorrectCount.ToString(CultureInfo.InvariantCulture)),
                Csv(a.ScorePercent.ToString(CultureInfo.InvariantCulture)),
                Csv(a.BonusPoints.ToString(CultureInfo.InvariantCulture)),
                Csv(a.IsVoided ? "1" : "0"),
                Csv(a.SubmittedAtUtc.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture)),
            }));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv; charset=utf-8", $"olympiad-attempts-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "";
        }

        if (value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0)
        {
            return "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
        }

        return value;
    }
}
