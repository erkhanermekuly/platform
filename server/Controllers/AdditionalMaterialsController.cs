using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/resources/materials")]
[ApiController]
[Authorize]
public class AdditionalMaterialsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await context.AdditionalMaterials
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

        var item = new AdditionalMaterialModel
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.AdditionalMaterials.Add(item);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = item.Id }, "Материал добавлен"));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await context.AdditionalMaterials.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Материал не найден"));
        }

        context.AdditionalMaterials.Remove(item);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Материал удалён"));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertResourceItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var item = await context.AdditionalMaterials.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Материал не найден"));
        }

        item.Title = dto.Title.Trim();
        item.Description = dto.Description.Trim();
        item.Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim();
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Материал обновлён"));
    }
}
