namespace server.Models;

public class LessonCompletionModel
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public AccountModel Account { get; set; } = null!;

    public int CourseLessonId { get; set; }

    public CourseLessonModel CourseLesson { get; set; } = null!;

    public DateTime CompletedAtUtc { get; set; }
}
