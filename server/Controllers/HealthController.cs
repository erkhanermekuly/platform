using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            return Ok(new { status = "ok", database = "connected", utc = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { status = "degraded", database = "error", error = ex.Message });
        }
    }
}
