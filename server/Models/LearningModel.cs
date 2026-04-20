namespace server.Models;

public class LearningModel
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public AccountModel Account { get; set; } = null!;

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public int Progress { get; set; }

    public DateTime LastAccessed { get; set; }

    /// <summary>Окончание доступа к урокам; null — без ограничения срока.</summary>
    public DateTime? AccessExpiresAtUtc { get; set; }
}
