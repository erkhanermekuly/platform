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
    private bool IsAdmin =>
        User.Identity?.IsAuthenticated == true && User.IsInRole("admin");

    [HttpGet]
    public async Task<IActionResult> GetCourses(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? level,
        [FromQuery] bool includeDrafts = false)
    {
        var query = context.Courses.AsNoTracking().AsQueryable();

        if (!IsAdmin || !includeDrafts)
        {
            query = query.Where(c => c.IsPublished);
        }

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
            .OrderByDescending(c => c.CatalogSortOrder)
            .ThenByDescending(c => c.Rating)
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
                duration = c.Duration,
                isPublished = c.IsPublished,
                catalogSortOrder = c.CatalogSortOrder,
                freePreviewLessonCount = c.FreePreviewLessonCount,
                accessDurationDays = c.AccessDurationDays,
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(courses));
    }

    [Authorize(Roles = "admin")]
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
                duration = c.Duration,
                isPublished = c.IsPublished,
                catalogSortOrder = c.CatalogSortOrder,
                freePreviewLessonCount = c.FreePreviewLessonCount,
                accessDurationDays = c.AccessDurationDays,
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
            .Where(c => c.IsPublished && (c.Title.ToLower().Contains(term) || c.Description.ToLower().Contains(term)))
            .OrderByDescending(c => c.CatalogSortOrder)
            .ThenByDescending(c => c.Rating)
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
    public async Task<IActionResult> GetCourse(int id, [FromQuery] bool preview = false)
    {
        var course = await context.Courses
            .Include(c => c.Modules.OrderBy(m => m.SortOrder))
            .Include(c => c.Lessons)
            .Include(c => c.Files.OrderByDescending(f => f.UploadedAt))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var allowUnpublished = IsAdmin && preview;
        if (!course.IsPublished && !allowUnpublished)
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
                bio = course.InstructorBio
            },
            rating = course.Rating,
            students = course.Students,
            duration = course.Duration,
            isPublished = course.IsPublished,
            catalogSortOrder = course.CatalogSortOrder,
            freePreviewLessonCount = course.FreePreviewLessonCount,
            accessDurationDays = course.AccessDurationDays,
            previewMode = allowUnpublished,
            modules = course.Modules.Select(m => new
            {
                id = m.Id,
                title = m.Title,
                lessons = m.Lessons,
                duration = m.Duration
            }),
            lessons = course.Lessons
                .OrderBy(l => l.SortOrder)
                .ThenBy(l => l.Id)
                .Select(l => new
                {
                    id = l.Id,
                    title = l.Title,
                    description = l.Description,
                    sortOrder = l.SortOrder,
                }),
            files = course.Files
                .Where(f => f.LessonId == null)
                .Select(f => new
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

    [Authorize(Roles = "admin")]
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
            CreatedByAccountId = userId,
            IsPublished = dto.IsPublished ?? false,
            CatalogSortOrder = dto.CatalogSortOrder ?? 0,
            FreePreviewLessonCount = dto.FreePreviewLessonCount ?? 0,
            AccessDurationDays = dto.AccessDurationDays,
        };

        context.Courses.Add(course);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourse), new { id = course.Id }, ApiResponse<object>.Ok(new { id = course.Id }));
    }

    [Authorize(Roles = "admin")]
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

        if (dto.IsPublished.HasValue)
        {
            course.IsPublished = dto.IsPublished.Value;
        }

        if (dto.CatalogSortOrder.HasValue)
        {
            course.CatalogSortOrder = dto.CatalogSortOrder.Value;
        }

        if (dto.FreePreviewLessonCount.HasValue)
        {
            course.FreePreviewLessonCount = dto.FreePreviewLessonCount.Value;
        }

        if (dto.AccessDurationDays.HasValue)
        {
            course.AccessDurationDays = dto.AccessDurationDays;
        }

        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Курс обновлен"));
    }

    [Authorize(Roles = "admin")]
    [HttpPost("{id:int}/duplicate")]
    public async Task<IActionResult> Duplicate(int id)
    {
        var userId = GetUserId();
        var src = await context.Courses
            .Include(c => c.Lessons)
            .Include(c => c.Modules)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (src is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var clone = new CourseModel
        {
            Title = src.Title + " (копия)",
            Description = src.Description,
            Category = src.Category,
            Level = src.Level,
            Price = src.Price,
            IsLocked = src.IsLocked,
            VideoUrl = src.VideoUrl,
            Image = src.Image,
            InstructorName = src.InstructorName,
            InstructorAvatar = src.InstructorAvatar,
            InstructorBio = src.InstructorBio,
            Duration = src.Duration,
            Rating = 0,
            Students = 0,
            CreatedByAccountId = userId,
            IsPublished = false,
            CatalogSortOrder = src.CatalogSortOrder,
            FreePreviewLessonCount = src.FreePreviewLessonCount,
            AccessDurationDays = src.AccessDurationDays,
        };

        context.Courses.Add(clone);
        await context.SaveChangesAsync();

        foreach (var m in src.Modules.OrderBy(m => m.SortOrder))
        {
            context.CourseModules.Add(new CourseModuleModel
            {
                CourseId = clone.Id,
                Title = m.Title,
                Lessons = m.Lessons,
                Duration = m.Duration,
                SortOrder = m.SortOrder,
            });
        }

        foreach (var l in src.Lessons.OrderBy(l => l.SortOrder).ThenBy(l => l.Id))
        {
            context.CourseLessons.Add(new CourseLessonModel
            {
                CourseId = clone.Id,
                Title = l.Title,
                Description = l.Description,
                SortOrder = l.SortOrder,
                VideoUrl = l.VideoUrl,
            });
        }

        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = clone.Id }));
    }

    [Authorize(Roles = "admin")]
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
