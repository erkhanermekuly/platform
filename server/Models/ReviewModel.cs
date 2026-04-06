namespace server.Models;

public class ReviewModel
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public int AccountId { get; set; }

    public AccountModel Account { get; set; } = null!;

    public int Rating { get; set; }

    public string Text { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
