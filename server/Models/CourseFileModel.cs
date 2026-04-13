namespace server.Models;

public class CourseFileModel
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public int? LessonId { get; set; }

    public CourseLessonModel? Lesson { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string RelativePath { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public DateTime UploadedAt { get; set; }
}
