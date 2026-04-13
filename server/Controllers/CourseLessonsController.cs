using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
namespace server.Controllers;

[Authorize]
[Route("api/courses/{courseId:int}/lessons")]
[ApiController]
public class CourseLessonsController(AppDbContext context, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(int courseId, [FromBody] CourseLessonUpsertDto dto)
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
            Description = dto.Description.Trim(),
            SortOrder = dto.SortOrder,
        };

        context.CourseLessons.Add(lesson);
        await context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.Ok(new { id = lesson.Id }));
    }

    [HttpPut("{lessonId:int}")]
    public async Task<IActionResult> Update(int courseId, int lessonId, [FromBody] CourseLessonUpsertDto dto)
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
        lesson.Description = dto.Description.Trim();
        lesson.SortOrder = dto.SortOrder;

        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Урок обновлён"));
    }

    [HttpDelete("{lessonId:int}")]
    public async Task<IActionResult> Delete(int courseId, int lessonId)
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

    /// <summary>Загрузить видео урока (один файл). Сохраняется как материал и выставляется VideoUrl.</summary>
    [HttpPost("{lessonId:int}/video")]
    [RequestSizeLimit(500_000_000)]
    public async Task<IActionResult> UploadVideo(int courseId, int lessonId)
    {
        var lesson = await context.CourseLessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.CourseId == courseId);
        if (lesson is null)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        if (Request.Form.Files.Count != 1)
        {
            return BadRequest(ApiResponse.Error("Нужно передать ровно один видеофайл"));
        }

        var formFile = Request.Form.Files[0];
        if (formFile.Length <= 0)
        {
            return BadRequest(ApiResponse.Error("Пустой файл"));
        }

        var ext = Path.GetExtension(formFile.FileName).ToLowerInvariant();
        if (ext is not (".mp4" or ".webm" or ".mov"))
        {
            return BadRequest(ApiResponse.Error("Допустимы форматы: mp4, webm, mov"));
        }

        var uploadRoot = Path.Combine(env.ContentRootPath, "uploads", "courses", courseId.ToString());
        Directory.CreateDirectory(uploadRoot);

        var originalName = Path.GetFileName(formFile.FileName);
        var safeName = $"lesson-{lessonId}-{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(uploadRoot, safeName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await formFile.CopyToAsync(stream);
        }

        var fileRow = new CourseFileModel
        {
            CourseId = courseId,
            LessonId = lessonId,
            Name = originalName,
            Type = ext.TrimStart('.'),
            RelativePath = Path.Combine("uploads", "courses", courseId.ToString(), safeName).Replace("\\", "/"),
            SizeBytes = formFile.Length,
            UploadedAt = DateTime.UtcNow,
        };

        context.CourseFiles.Add(fileRow);
        await context.SaveChangesAsync();

        lesson.VideoUrl = $"/api/courses/{courseId}/files/{fileRow.Id}/download";
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            videoUrl = lesson.VideoUrl,
            fileId = fileRow.Id,
        }, "Видео загружено"));
    }
}
