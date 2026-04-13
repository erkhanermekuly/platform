using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Models;

[Table("CourseLessons")]
public class CourseLessonModel
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? VideoUrl { get; set; }

    public int SortOrder { get; set; }

    public ICollection<CourseFileModel> Files { get; set; } = [];
}
