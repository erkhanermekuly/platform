using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/resources/scenarios")]
[ApiController]
[Authorize]
public class EventScenariosController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await context.EventScenarios
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                description = x.Description,
                url = x.Url,
                createdAtUtc = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] UpsertResourceItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var item = new EventScenarioModel
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.EventScenarios.Add(item);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = item.Id }, "Сценарий добавлен"));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await context.EventScenarios.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Сценарий не найден"));
        }

        context.EventScenarios.Remove(item);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Сценарий удалён"));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertResourceItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var item = await context.EventScenarios.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Сценарий не найден"));
        }

        item.Title = dto.Title.Trim();
        item.Description = dto.Description.Trim();
        item.Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim();
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Сценарий обновлён"));
    }
}
