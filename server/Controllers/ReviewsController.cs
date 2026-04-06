using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using System.Security.Claims;

namespace server.Controllers;

[Route("api/reviews")]
[ApiController]
public class ReviewsController(AppDbContext context) : ControllerBase
{
    [HttpGet("course/{courseId:int}")]
    [HttpGet("/api/courses/{courseId:int}/reviews")]
    public async Task<IActionResult> GetCourseReviews(int courseId)
    {
        var reviews = await context.Reviews
            .AsNoTracking()
            .Include(x => x.Account)
            .Where(x => x.CourseId == courseId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                id = x.Id,
                user = x.Account.Name,
                rating = x.Rating,
                text = x.Text,
                date = x.CreatedAt.ToString("yyyy-MM-dd")
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(reviews));
    }

    [Authorize]
    [HttpPost("course/{courseId:int}")]
    [HttpPost("/api/courses/{courseId:int}/reviews")]
    public async Task<IActionResult> AddReview(int courseId, [FromBody] AddReviewDto dto)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var account = await context.Accounts.FindAsync(userId.Value);
        var course = await context.Courses.FindAsync(courseId);

        if (account is null)
        {
            return NotFound(ApiResponse.Error("Пользователь не найден"));
        }

        if (course is null)
        {
            return NotFound(ApiResponse.Error("Курс не найден"));
        }

        var review = new ReviewModel
        {
            AccountId = account.Id,
            CourseId = courseId,
            Rating = dto.Rating,
            Text = dto.Text,
            CreatedAt = DateTime.UtcNow
        };

        context.Reviews.Add(review);
        await context.SaveChangesAsync();

        var avgRating = await context.Reviews
            .Where(r => r.CourseId == courseId)
            .AverageAsync(r => (double?)r.Rating) ?? 0;

        course.Rating = Math.Round(avgRating, 1);
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Отзыв опубликован"));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
