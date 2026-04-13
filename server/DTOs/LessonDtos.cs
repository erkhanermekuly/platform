using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class CourseLessonUpsertDto
{
    [Required]
    [MinLength(2)]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? Description { get; set; }

    [Range(0, 10_000)]
    public int SortOrder { get; set; }

    [MaxLength(1024)]
    public string? VideoUrl { get; set; }
}
