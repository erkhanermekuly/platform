using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class OlympiadAnswerModel
{
    public int Id { get; set; }

    public int QuestionId { get; set; }

    public OlympiadQuestionModel Question { get; set; } = null!;

    [Required]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int SortOrder { get; set; }
}
