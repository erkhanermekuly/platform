using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using server.DTOs;
using server.Infrastructure;

namespace server.Controllers;

/// <summary>
/// Только среда Development: полностью удаляет БД, создаёт заново и запускает сидер.
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class ResetController(AppDbContext context, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> InitialData(CancellationToken cancellationToken = default)
    {
        if (!env.IsDevelopment())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                ApiResponse.Error("Сброс БД доступен только при ASPNETCORE_ENVIRONMENT=Development. Либо перезапустите API в Development — старые ivan/maria будут обновлены до admin@ / teacher@ автоматически."));
        }

        await context.Database.EnsureDeletedAsync(cancellationToken);
        await context.Database.EnsureCreatedAsync(cancellationToken);
        await SchemaPatcher.ApplyAsync(context, cancellationToken);
        await DatabaseSeeder.SeedIfEmptyAsync(context, cancellationToken);

        return Ok(ApiResponse.Ok("Дерекқор тазаланды, демо-деректер қайта жазылды."));
    }
}
