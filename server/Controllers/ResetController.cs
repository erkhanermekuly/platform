#if DEBUG
using Microsoft.AspNetCore.Mvc;

namespace server.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ResetController(AppDbContext _context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> InitialData()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.Database.EnsureCreatedAsync();
        return Ok();
    }
}
#endif