using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/courses/{courseId:int}/files")]
[ApiController]
public class CourseFilesController(AppDbContext context, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFiles(int courseId)
    {
        var exists = await context.Courses.AsNoTracking().AnyAsync(c => c.Id == courseId);
        if (!exists)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var files = await context.CourseFiles
            .AsNoTracking()
            .Where(f => f.CourseId == courseId && f.LessonId == null)
            .OrderByDescending(f => f.UploadedAt)
            .Select(f => new
            {
                id = f.Id,
                name = f.Name,
                type = f.Type,
                sizeBytes = f.SizeBytes,
                uploadedAt = f.UploadedAt,
                url = $"/api/courses/{courseId}/files/{f.Id}/download"
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(files));
    }

    [Authorize]
    [HttpPost]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> UploadFiles(int courseId, [FromQuery] int? lessonId)
    {
        var course = await context.Courses.FindAsync(courseId);
        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        if (lessonId is not null)
        {
            var lessonOk = await context.CourseLessons.AnyAsync(l => l.Id == lessonId && l.CourseId == courseId);
            if (!lessonOk)
            {
                return BadRequest(ApiResponse.Error("Урок не принадлежит этому курсу"));
            }
        }

        if (Request.Form.Files.Count == 0)
        {
            return BadRequest(ApiResponse.Error("Не переданы файлы"));
        }

        var uploadRoot = Path.Combine(env.ContentRootPath, "uploads", "courses", courseId.ToString());
        Directory.CreateDirectory(uploadRoot);

        var saved = new List<CourseFileModel>();

        foreach (var formFile in Request.Form.Files)
        {
            if (formFile.Length <= 0)
            {
                continue;
            }

            var originalName = Path.GetFileName(formFile.FileName);
            var safeName = $"{Guid.NewGuid():N}-{originalName}";
            var fullPath = Path.Combine(uploadRoot, safeName);

            await using var stream = System.IO.File.Create(fullPath);
            await formFile.CopyToAsync(stream);

            var extension = Path.GetExtension(originalName).Trim('.').ToLower();

            var item = new CourseFileModel
            {
                CourseId = courseId,
                LessonId = lessonId,
                Name = originalName,
                Type = string.IsNullOrWhiteSpace(extension) ? "file" : extension,
                RelativePath = Path.Combine("uploads", "courses", courseId.ToString(), safeName).Replace("\\", "/"),
                SizeBytes = formFile.Length,
                UploadedAt = DateTime.UtcNow
            };

            saved.Add(item);
        }

        if (saved.Count == 0)
        {
            return BadRequest(ApiResponse.Error("Файлы пустые или невалидные"));
        }

        context.CourseFiles.AddRange(saved);
        await context.SaveChangesAsync();

        var result = saved.Select(f => new
        {
            id = f.Id,
            name = f.Name,
            type = f.Type,
            sizeBytes = f.SizeBytes,
            uploadedAt = f.UploadedAt,
            url = $"/api/courses/{courseId}/files/{f.Id}/download"
        });

        return Ok(ApiResponse<object>.Ok(result, "Файлы загружены"));
    }

    [HttpGet("{fileId:int}/download")]
    public async Task<IActionResult> Download(int courseId, int fileId)
    {
        var file = await context.CourseFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId && f.CourseId == courseId);

        if (file is null)
        {
            return NotFound(ApiResponse.Error("Файл не найден"));
        }

        var path = Path.Combine(env.ContentRootPath, file.RelativePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (!System.IO.File.Exists(path))
        {
            return NotFound(ApiResponse.Error("Файл отсутствует на сервере"));
        }

        var contentType = GuessContentType(file.Name);
        return PhysicalFile(path, contentType, file.Name);
    }

    private static string GuessContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}
