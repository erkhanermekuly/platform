using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server;
using server.DTOs;

namespace server.Controllers;

[Route("api/admin/audit")]
[ApiController]
[Authorize(Roles = "admin")]
public class AdminAuditController(AppDbContext context) : ControllerBase
{
    [HttpGet("recent")]
    public async Task<IActionResult> Recent([FromQuery] int take = 200)
    {
        take = Math.Clamp(take, 1, 2000);
        var rows = await context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.Id)
            .Take(take)
            .Select(x => new
            {
                x.Id,
                x.AccountId,
                x.ActorEmail,
                httpMethod = x.HttpMethod,
                path = x.Path,
                x.StatusCode,
                x.Details,
                createdAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(rows));
    }
}
