using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;

namespace server.Controllers;

[Route("api/categories")]
[ApiController]
public class CategoriesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var grouped = await context.Courses
            .AsNoTracking()
            .GroupBy(c => c.Category.ToLower())
            .Select(g => new
            {
                slug = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ThenBy(x => x.slug)
            .ToListAsync();

        var categories = grouped
            .Select((x, index) => new
            {
                id = index + 1,
                name = ToTitleCase(x.slug),
                slug = x.slug,
                count = x.count
            })
            .ToList();

        return Ok(ApiResponse<object>.Ok(categories));
    }

    private static string ToTitleCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return char.ToUpper(value[0]) + value[1..];
    }
}
