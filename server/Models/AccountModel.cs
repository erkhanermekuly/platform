using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class AccountModel
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(191)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Role { get; set; } = "student";

    [MaxLength(512)]
    public string Avatar { get; set; } = string.Empty;

    /// <summary>Блокировка входа (управляется администратором).</summary>
    public bool IsBlocked { get; set; }

    public ICollection<CourseModel> CreatedCourses { get; set; } = [];

    public ICollection<LearningModel> Enrollments { get; set; } = [];

    public ICollection<ReviewModel> Reviews { get; set; } = [];

    public ICollection<PaymentModel> Payments { get; set; } = [];

    public ICollection<LessonCompletionModel> LessonCompletions { get; set; } = [];

    public ICollection<OlympiadAttemptModel> OlympiadAttempts { get; set; } = [];
}
