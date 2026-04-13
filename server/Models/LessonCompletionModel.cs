using System.ComponentModel.DataAnnotations.Schema;

namespace server.Models;

[Table("LessonCompletions")]
public class LessonCompletionModel
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public AccountModel Account { get; set; } = null!;

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public int LessonId { get; set; }

    public CourseLessonModel Lesson { get; set; } = null!;

    public DateTime CompletedAt { get; set; }
}
