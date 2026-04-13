using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class CourseLessonModel
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    [MaxLength(1024)]
    public string? VideoUrl { get; set; }

    public ICollection<CourseFileModel> Files { get; set; } = [];

    public ICollection<LessonCompletionModel> Completions { get; set; } = [];
}
