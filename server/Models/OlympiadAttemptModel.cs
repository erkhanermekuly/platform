using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class OlympiadAttemptModel
{
    public int Id { get; set; }

    [Required]
    public int AccountId { get; set; }

    [Required]
    public int OlympiadId { get; set; }

    public int TotalQuestions { get; set; }

    public int CorrectCount { get; set; }

    public int ScorePercent { get; set; }

    /// <summary>Бонусные баллы от администратора (могут быть отрицательными как штраф).</summary>
    public int BonusPoints { get; set; }

    /// <summary>Аннулированная попытка не участвует в рейтинге и не блокирует повторное прохождение.</summary>
    public bool IsVoided { get; set; }

    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;

    public AccountModel? Account { get; set; }

    public OlympiadModel? Olympiad { get; set; }
}
