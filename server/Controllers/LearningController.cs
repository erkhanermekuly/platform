using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using server.Services;
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

    /// <summary>Какие уроки курса пользователь уже завершил (досмотрел видео до конца).</summary>
    [HttpGet("courses/{courseId:int}/lesson-progress")]
    public async Task<IActionResult> GetLessonProgress(int courseId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var enrolled = await context.Learnings.AnyAsync(x => x.AccountId == userId && x.CourseId == courseId);
        if (!enrolled)
        {
            return BadRequest(ApiResponse.Error("Сначала запишитесь на курс"));
        }

        var completed = await context.LessonCompletions
            .AsNoTracking()
            .Where(c => c.AccountId == userId && c.CourseId == courseId)
            .Select(c => c.LessonId)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(new { completedLessonIds = completed }));
    }

    /// <summary>Отметить урок завершённым после просмотра видео (с проверкой последовательности).</summary>
    [HttpPost("lessons/{lessonId:int}/complete")]
    public async Task<IActionResult> CompleteLesson(int lessonId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var lesson = await context.CourseLessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson is null)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        var enrolled = await context.Learnings.AnyAsync(x => x.AccountId == userId && x.CourseId == lesson.CourseId);
        if (!enrolled)
        {
            return BadRequest(ApiResponse.Error("Сначала запишитесь на курс"));
        }

        if (!await LessonProgressRules.IsLessonUnlockedAsync(context, userId.Value, lesson))
        {
            return BadRequest(ApiResponse.Error("Сначала завершите предыдущий урок"));
        }

        var already = await context.LessonCompletions.AnyAsync(c => c.AccountId == userId && c.LessonId == lessonId);
        if (already)
        {
            return Ok(ApiResponse.Ok("Урок уже был завершён"));
        }

        context.LessonCompletions.Add(new LessonCompletionModel
        {
            AccountId = userId.Value,
            CourseId = lesson.CourseId,
            LessonId = lessonId,
            CompletedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        var learning = await context.Learnings.FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == lesson.CourseId);
        if (learning is not null)
        {
            learning.Progress = await LessonProgressRules.ComputeCourseProgressPercentAsync(context, userId.Value, lesson.CourseId);
            learning.LastAccessed = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        var pct = learning?.Progress ?? 0;
        return Ok(ApiResponse<object>.Ok(new { progress = pct }));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
