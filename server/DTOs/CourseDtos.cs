using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class CourseUpsertDto
{
    [Required]
    [MinLength(3)]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MinLength(10)]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(80)]
    public string? Level { get; set; }

    [Range(0, 999999)]
    public decimal Price { get; set; }

    public bool? IsLocked { get; set; }

    [MaxLength(1024)]
    public string? VideoUrl { get; set; }

    [MaxLength(1024)]
    public string? Image { get; set; }

    [MaxLength(120)]
    public string? Instructor { get; set; }

    [MaxLength(1024)]
    public string? InstructorAvatar { get; set; }

    [MaxLength(2000)]
    public string? InstructorBio { get; set; }

    [MaxLength(100)]
    public string? Duration { get; set; }

    public bool? IsPublished { get; set; }

    public int? CatalogSortOrder { get; set; }

    [Range(0, 500)]
    public int? FreePreviewLessonCount { get; set; }

    [Range(1, 36500)]
    public int? AccessDurationDays { get; set; }
}

public class UpdateProgressDto
{
    [Range(1, int.MaxValue)]
    public int LessonId { get; set; }

    [Range(0, 100)]
    public int Progress { get; set; }
}

public class AddReviewDto
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [Required]
    [MinLength(3)]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
}

public class ProcessPaymentDto
{
    [Range(1, int.MaxValue)]
    public int CourseId { get; set; }

    public decimal? Amount { get; set; }

    [MaxLength(120)]
    public string? CardHolder { get; set; }

    [MaxLength(30)]
    public string? CardNumber { get; set; }
}
