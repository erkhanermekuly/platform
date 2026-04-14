using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/courses/{courseId:int}/lessons")]
[Route("api/course/{courseId:int}/lessons")]
[ApiController]
[Authorize(Roles = "admin")]
public class CourseLessonsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListLessons(int courseId)
    {
        var exists = await context.Courses.AsNoTracking().AnyAsync(c => c.Id == courseId);
        if (!exists)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var lessons = await context.CourseLessons
            .AsNoTracking()
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Id)
            .ToListAsync();

        var files = await context.CourseFiles
            .AsNoTracking()
            .Where(f => f.CourseId == courseId && f.LessonId != null)
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();

        var byLesson = files.GroupBy(f => f.LessonId!.Value).ToDictionary(g => g.Key, g => g.ToList());

        var payload = lessons.Select(l =>
        {
            var list = byLesson.TryGetValue(l.Id, out var lf) ? lf : new List<CourseFileModel>();
            return new
            {
                id = l.Id,
                title = l.Title,
                description = l.Description,
                sortOrder = l.SortOrder,
                videoUrl = l.VideoUrl,
                materials = list
                    .Select(f => new
                    {
                        id = f.Id,
                        name = f.Name,
                        type = f.Type,
                        url = $"/api/courses/{courseId}/files/{f.Id}/download",
                    })
                    .ToList(),
            };
        }).ToList();

        return Ok(ApiResponse<object>.Ok(payload));
    }

    [HttpPost]
    public async Task<IActionResult> CreateLesson(int courseId, [FromBody] CourseLessonUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var course = await context.Courses.FindAsync(courseId);
        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var lesson = new CourseLessonModel
        {
            CourseId = courseId,
            Title = dto.Title.Trim(),
            Description = (dto.Description ?? string.Empty).Trim(),
            SortOrder = dto.SortOrder,
            VideoUrl = string.IsNullOrWhiteSpace(dto.VideoUrl) ? null : dto.VideoUrl.Trim(),
        };

        context.CourseLessons.Add(lesson);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(ListLessons), new { courseId }, ApiResponse<object>.Ok(new { id = lesson.Id }));
    }

    [HttpPut("{lessonId:int}")]
    public async Task<IActionResult> UpdateLesson(int courseId, int lessonId, [FromBody] CourseLessonUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var lesson = await context.CourseLessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.CourseId == courseId);
        if (lesson is null)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        lesson.Title = dto.Title.Trim();
        lesson.Description = (dto.Description ?? string.Empty).Trim();
        lesson.SortOrder = dto.SortOrder;
        lesson.VideoUrl = string.IsNullOrWhiteSpace(dto.VideoUrl) ? null : dto.VideoUrl.Trim();

        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Урок обновлён"));
    }

    [HttpDelete("{lessonId:int}")]
    public async Task<IActionResult> DeleteLesson(int courseId, int lessonId)
    {
        var lesson = await context.CourseLessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.CourseId == courseId);
        if (lesson is null)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        context.CourseLessons.Remove(lesson);
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Урок удалён"));
    }
}
