namespace server.Models;

public class CourseModuleModel
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public int Lessons { get; set; }

    public string Duration { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
