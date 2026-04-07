using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using System.Security.Claims;

namespace server.Controllers;

[Route("api/course")]
[Route("api/courses")]
[ApiController]
public class CourseController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCourses([FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? level)
    {
        var query = context.Courses.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(term) || c.Description.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = category.Trim().ToLower();
            query = query.Where(c => c.Category.ToLower() == normalized);
        }

        if (!string.IsNullOrWhiteSpace(level))
        {
            var normalized = level.Trim().ToLower();
            query = query.Where(c => c.Level.ToLower() == normalized);
        }

        var courses = await query
            .OrderByDescending(c => c.Rating)
            .ThenBy(c => c.Title)
            .Select(c => new
            {
                id = c.Id,
                title = c.Title,
                description = c.Description,
                category = c.Category,
                level = c.Level,
                price = c.Price,
                isLocked = c.IsLocked,
                videoUrl = c.VideoUrl,
                image = c.Image,
                instructor = c.InstructorName,
                rating = c.Rating,
                students = c.Students,
                duration = c.Duration
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(courses));
    }

    [Authorize]
    [HttpGet("my-courses")]
    public async Task<IActionResult> GetMyCourses()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var courses = await context.Courses
            .AsNoTracking()
            .Where(c => c.CreatedByAccountId == userId)
            .OrderByDescending(c => c.Id)
            .Select(c => new
            {
                id = c.Id,
                title = c.Title,
                description = c.Description,
                category = c.Category,
                level = c.Level,
                price = c.Price,
                isLocked = c.IsLocked,
                videoUrl = c.VideoUrl,
                image = c.Image,
                instructor = c.InstructorName,
                rating = c.Rating,
                students = c.Students,
                duration = c.Duration
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(courses));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query)
    {
        var term = query.Trim().ToLower();

        var result = await context.Courses
            .AsNoTracking()
            .Where(c => c.Title.ToLower().Contains(term) || c.Description.ToLower().Contains(term))
            .OrderByDescending(c => c.Rating)
            .Select(c => new
            {
                id = c.Id,
                title = c.Title,
                category = c.Category,
                rating = c.Rating
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCourse(int id)
    {
        var course = await context.Courses
            .Include(c => c.Modules.OrderBy(m => m.SortOrder))
            .Include(c => c.Files.OrderByDescending(f => f.UploadedAt))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var result = new
        {
            id = course.Id,
            title = course.Title,
            description = course.Description,
            category = course.Category,
            level = course.Level,
            price = course.Price,
            isLocked = course.IsLocked,
            videoUrl = course.VideoUrl,
            image = course.Image,
            instructor = new
            {
                id = 1,
                name = course.InstructorName,
                avatar = course.InstructorAvatar,
                bio = course.InstructorBio
            },
            rating = course.Rating,
            students = course.Students,
            duration = course.Duration,
            modules = course.Modules.Select(m => new
            {
                id = m.Id,
                title = m.Title,
                lessons = m.Lessons,
                duration = m.Duration
            }),
            files = course.Files.Select(f => new
            {
                id = f.Id,
                name = f.Name,
                type = f.Type,
                sizeBytes = f.SizeBytes,
                uploadedAt = f.UploadedAt,
                url = $"/api/courses/{course.Id}/files/{f.Id}/download"
            })
        };

        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateCourse([FromBody] CourseUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var userId = GetUserId();

        var course = new CourseModel
        {
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Level = NormalizeLevel(dto.Level, dto.Category),
            Price = dto.Price,
            IsLocked = dto.IsLocked ?? dto.Price > 0,
            VideoUrl = dto.VideoUrl,
            Image = dto.Image,
            InstructorName = string.IsNullOrWhiteSpace(dto.Instructor) ? "Не указан" : dto.Instructor,
            InstructorAvatar = dto.InstructorAvatar,
            InstructorBio = dto.InstructorBio,
            Duration = dto.Duration,
            Rating = 0,
            Students = 0,
            CreatedByAccountId = userId
        };

        context.Courses.Add(course);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourse), new { id = course.Id }, ApiResponse<object>.Ok(new { id = course.Id }));
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCourse(int id, [FromBody] CourseUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var course = await context.Courses.FindAsync(id);
        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Category = dto.Category;
        course.Level = NormalizeLevel(dto.Level, dto.Category);
        course.Price = dto.Price;
        course.IsLocked = dto.IsLocked ?? dto.Price > 0;
        course.VideoUrl = dto.VideoUrl;
        course.Image = dto.Image;
        course.InstructorName = string.IsNullOrWhiteSpace(dto.Instructor) ? course.InstructorName : dto.Instructor;
        course.InstructorAvatar = dto.InstructorAvatar;
        course.InstructorBio = dto.InstructorBio;
        course.Duration = dto.Duration;

        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Курс обновлен"));
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCourse(int id)
    {
        var course = await context.Courses.FindAsync(id);

        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        context.Courses.Remove(course);
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Курс удален"));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }

    private static string NormalizeLevel(string? level, string category)
    {
        if (!string.IsNullOrWhiteSpace(level))
        {
            return level.Trim().ToLower();
        }

        return category.Trim().ToLower() switch
        {
            "beginner" => "beginner",
            "intermediate" => "intermediate",
            "advanced" => "advanced",
            _ => "beginner"
        };
    }
}
