#if DEBUG
using Microsoft.AspNetCore.Mvc;
using server.DTOs;
using server.Infrastructure;

namespace server.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ResetController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> InitialData()
    {
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
        await DatabaseSeeder.SeedIfEmptyAsync(context);

        return Ok(ApiResponse.Ok("База сброшена и заполнена тестовыми данными"));
    }
}
#endif
