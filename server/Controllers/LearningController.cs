using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Infrastructure;
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
                instructor = x.Course.InstructorName,
                accessExpiresAtUtc = x.AccessExpiresAtUtc,
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

        if (course.Price > 0)
        {
            var hasPaid = await context.Payments.AnyAsync(p =>
                p.AccountId == userId && p.CourseId == courseId && p.Status == "completed");
            if (!hasPaid)
            {
                return BadRequest(ApiResponse.Error("Для платного курса сначала оформите оплату — после неё откроется первый урок."));
            }
        }

        var existing = await context.Learnings.FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == courseId);
        if (existing is not null)
        {
            return Ok(ApiResponse.Ok("Вы уже записаны на курс"));
        }

        var now = DateTime.UtcNow;
        context.Learnings.Add(new LearningModel
        {
            AccountId = userId.Value,
            CourseId = courseId,
            Progress = 0,
            LastAccessed = now,
            AccessExpiresAtUtc = CourseAccessRules.ComputeAccessExpiryUtc(now, course),
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

    /// <summary>
    /// Программа курса: при записи — цепочка уроков; без записи на платный курс — превью первых N уроков.
    /// </summary>
    [HttpGet("course/{courseId:int}/curriculum")]
    public async Task<IActionResult> GetCourseCurriculum(int courseId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var courseRow = await context.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId);
        if (courseRow is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var learningRow = await context.Learnings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == courseId);

        var isPreviewOnly = learningRow is null;
        if (learningRow is not null &&
            learningRow.AccessExpiresAtUtc is DateTime exp &&
            exp < DateTime.UtcNow)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Error("Срок доступа к материалам курса истёк."));
        }

        if (isPreviewOnly)
        {
            if (courseRow.Price <= 0)
            {
                return Forbid();
            }
        }

        var previewCount = courseRow.FreePreviewLessonCount > 0 ? courseRow.FreePreviewLessonCount : 1;

        var lessons = await context.CourseLessons
            .AsNoTracking()
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Id)
            .ToListAsync();

        if (lessons.Count == 0)
        {
            return Ok(ApiResponse<object>.Ok(Array.Empty<object>()));
        }

        var lessonIds = lessons.Select(l => l.Id).ToList();
        var completedIds = await context.LessonCompletions
            .AsNoTracking()
            .Where(c => c.AccountId == userId && lessonIds.Contains(c.CourseLessonId))
            .Select(c => c.CourseLessonId)
            .ToListAsync();

        var completedSet = completedIds.ToHashSet();

        var files = await context.CourseFiles
            .AsNoTracking()
            .Where(f => f.CourseId == courseId && f.LessonId != null && lessonIds.Contains(f.LessonId.Value))
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();

        var filesByLesson = files.GroupBy(f => f.LessonId!.Value).ToDictionary(g => g.Key, g => g.ToList());

        var payload = new List<object>();
        for (var i = 0; i < lessons.Count; i++)
        {
            var lesson = lessons[i];
            var isCompleted = completedSet.Contains(lesson.Id);
            bool isUnlocked;
            string? teaserDescription = null;
            if (isPreviewOnly)
            {
                isUnlocked = i < previewCount;
                if (!isUnlocked)
                {
                    teaserDescription = "Оформите доступ к курсу, чтобы смотреть этот урок.";
                }
            }
            else
            {
                isUnlocked = i == 0 || completedSet.Contains(lessons[i - 1].Id);
                if (!isUnlocked)
                {
                    teaserDescription = "Разблокируется после просмотра предыдущего урока до конца.";
                }
            }

            object materials;
            if (isUnlocked && filesByLesson.TryGetValue(lesson.Id, out var mats))
            {
                materials = mats
                    .Select(f => new
                    {
                        id = f.Id,
                        name = f.Name,
                        type = f.Type,
                        url = $"/api/courses/{courseId}/files/{f.Id}/download",
                    })
                    .ToList();
            }
            else
            {
                materials = new List<object>();
            }

            payload.Add(new
            {
                id = lesson.Id,
                title = lesson.Title,
                description = isUnlocked ? lesson.Description : teaserDescription,
                sortOrder = lesson.SortOrder,
                videoUrl = isUnlocked ? lesson.VideoUrl : null,
                isUnlocked,
                isCompleted,
                materials,
                previewOnly = isPreviewOnly,
            });
        }

        return Ok(ApiResponse<object>.Ok(payload));
    }

    [HttpPost("lessons/{lessonId:int}/complete")]
    public async Task<IActionResult> CompleteLesson(int lessonId)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var lesson = await context.CourseLessons
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson is null)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        var enrolled = await context.Learnings
            .FirstOrDefaultAsync(x => x.AccountId == userId && x.CourseId == lesson.CourseId);
        if (enrolled is null)
        {
            return Forbid();
        }

        if (enrolled.AccessExpiresAtUtc is DateTime exp2 && exp2 < DateTime.UtcNow)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Error("Срок доступа к курсу истёк."));
        }

        var ordered = await context.CourseLessons
            .AsNoTracking()
            .Where(l => l.CourseId == lesson.CourseId)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Id)
            .Select(l => l.Id)
            .ToListAsync();

        var idx = ordered.IndexOf(lessonId);
        if (idx < 0)
        {
            return NotFound(ApiResponse.Error("Урок не найден"));
        }

        if (idx > 0)
        {
            var prevId = ordered[idx - 1];
            var prevDone = await context.LessonCompletions
                .AnyAsync(c => c.AccountId == userId && c.CourseLessonId == prevId);
            if (!prevDone)
            {
                return BadRequest(ApiResponse.Error("Сначала завершите предыдущий урок (досмотрите видео до конца)"));
            }
        }

        var exists = await context.LessonCompletions
            .AnyAsync(c => c.AccountId == userId && c.CourseLessonId == lessonId);
        if (!exists)
        {
            context.LessonCompletions.Add(new LessonCompletionModel
            {
                AccountId = userId.Value,
                CourseLessonId = lessonId,
                CompletedAtUtc = DateTime.UtcNow,
            });
        }

        await context.SaveChangesAsync();

        var total = ordered.Count;
        var doneCount = await context.LessonCompletions
            .CountAsync(c => c.AccountId == userId.Value && ordered.Contains(c.CourseLessonId));

        enrolled.Progress = total > 0 ? (int)Math.Round(100.0 * doneCount / total) : 0;
        enrolled.LastAccessed = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { progress = enrolled.Progress, completed = true }));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }

}
