using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Infrastructure;

/// <summary>
/// После ответа API записывает действия администратора (POST/PUT/PATCH/DELETE к /api/...).
/// </summary>
public class AuditLogMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory, ILogger<AuditLogMiddleware> logger)
{
    private static readonly HashSet<string> Mutating = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE",
    };

    public async Task InvokeAsync(HttpContext context)
    {
        await next(context);

        if (context.User?.Identity?.IsAuthenticated != true)
            return;
        if (!context.User.IsInRole("admin"))
            return;
        if (!Mutating.Contains(context.Request.Method))
            return;

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            return;
        if (path.StartsWith("/api/notifications", StringComparison.OrdinalIgnoreCase))
            return;
        if (path.StartsWith("/api/admin/audit", StringComparison.OrdinalIgnoreCase))
            return;
        if (path.StartsWith("/api/admin/exports", StringComparison.OrdinalIgnoreCase))
            return;

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var userId = ParseUserId(context.User);
            var email = context.User.FindFirstValue(ClaimTypes.Email) ?? context.User.FindFirstValue(ClaimTypes.Name) ?? "";

            var details = new StringBuilder(256);
            details.Append("query=");
            details.Append(context.Request.QueryString.Value ?? string.Empty);
            if (context.Response.StatusCode >= 400)
                details.Append("; note=error_response");

            db.AuditLogs.Add(new AuditLogModel
            {
                AccountId = userId,
                ActorEmail = email.Length > 191 ? email[..191] : email,
                HttpMethod = context.Request.Method.Length > 16 ? context.Request.Method[..16] : context.Request.Method,
                Path = path.Length > 512 ? path[..512] : path,
                StatusCode = context.Response.StatusCode,
                Details = details.Length > 2000 ? details.ToString(0, 2000) : details.ToString(),
                CreatedAtUtc = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(context.RequestAborted);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Audit log write failed for {Path}", path);
        }
    }

    private static int? ParseUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : null;
    }
}
