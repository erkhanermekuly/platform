using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using System.Security.Claims;

namespace server.Controllers;

[Route("api/learning")]
[ApiController]
[Authorize]
public class LearningController(AppDbContext context) : ControllerBase
{
    [HttpGet("my")]
    [HttpGet]
    public async Task<IActionResult> GetMyLearning()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var items = await context.Learnings
            .AsNoTracking()
            .Include(x => x.Course)
            .Where(x => x.AccountId == userId)
            .OrderByDescending(x => x.LastAccessed)
            .Select(x => new
            {
                id = x.Id,
                courseId = x.CourseId,
                title = x.Course.Title,
                progress = x.Progress,
                lastAccessed = x.LastAccessed.ToString("yyyy-MM-dd"),
                image = x.Course.Image,
                instructor = x.Course.InstructorName
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpPost("enroll/{courseId:int}")]
    public async Task<IActionResult> EnrollCourse(int courseId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var course = await context.Courses.FindAsync(courseId);
        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var existing = await context.Learnings.FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == courseId);
        if (existing is not null)
        {
            return Ok(ApiResponse.Ok("Вы уже записаны на курс"));
        }

        context.Learnings.Add(new LearningModel
        {
            AccountId = userId.Value,
            CourseId = courseId,
            Progress = 0,
            LastAccessed = DateTime.UtcNow
        });

        course.Students += 1;
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Успешно зарегистрированы на курс"));
    }

    [HttpPut("progress/{courseId:int}")]
    public async Task<IActionResult> UpdateProgress(int courseId, [FromBody] UpdateProgressDto dto)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var learning = await context.Learnings.FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == courseId);
        if (learning is null)
        {
            return NotFound(ApiResponse.Error("Запись на курс не найдена"));
        }

        learning.Progress = dto.Progress;
        learning.LastAccessed = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { progress = learning.Progress }));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
