using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Services;

/// <summary>
/// Правила последовательного доступа: следующий урок открыт только после завершения предыдущего по порядку SortOrder.
/// </summary>
public static class LessonProgressRules
{
    public static async Task<bool> IsLessonUnlockedAsync(
        server.AppDbContext context,
        int accountId,
        CourseLessonModel lesson,
        CancellationToken cancellationToken = default)
    {
        var previous = await context.CourseLessons
            .AsNoTracking()
            .Where(l => l.CourseId == lesson.CourseId && l.SortOrder < lesson.SortOrder)
            .OrderByDescending(l => l.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        if (previous is null)
        {
            return true;
        }

        return await context.LessonCompletions
            .AsNoTracking()
            .AnyAsync(c => c.AccountId == accountId && c.LessonId == previous.Id, cancellationToken);
    }

    public static async Task<int> ComputeCourseProgressPercentAsync(
        server.AppDbContext context,
        int accountId,
        int courseId,
        CancellationToken cancellationToken = default)
    {
        var total = await context.CourseLessons
            .AsNoTracking()
            .CountAsync(l => l.CourseId == courseId, cancellationToken);
        if (total == 0)
        {
            return 0;
        }

        var done = await context.LessonCompletions
            .AsNoTracking()
            .CountAsync(c => c.AccountId == accountId && c.CourseId == courseId, cancellationToken);

        return (int)Math.Round(100.0 * done / total);
    }
}
