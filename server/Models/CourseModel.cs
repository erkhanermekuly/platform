using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class CourseModel
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Level { get; set; } = string.Empty;

    [Range(0, 5)]
    public double Rating { get; set; }

    [Range(0, int.MaxValue)]
    public int Students { get; set; }

    [Range(0, 999999)]
    public decimal Price { get; set; }

    public bool IsLocked { get; set; }

    [MaxLength(1024)]
    public string? VideoUrl { get; set; }

    [MaxLength(1024)]
    public string? Image { get; set; }

    [MaxLength(120)]
    public string InstructorName { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? InstructorAvatar { get; set; }

    [MaxLength(2000)]
    public string? InstructorBio { get; set; }

    [MaxLength(100)]
    public string? Duration { get; set; }

    public int? CreatedByAccountId { get; set; }

    public AccountModel? CreatedByAccount { get; set; }

    public ICollection<CourseModuleModel> Modules { get; set; } = [];

    public ICollection<CourseFileModel> Files { get; set; } = [];

    public ICollection<ReviewModel> Reviews { get; set; } = [];

    public ICollection<LearningModel> Enrollments { get; set; } = [];

    public ICollection<PaymentModel> Payments { get; set; } = [];
}
