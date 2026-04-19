using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class OlympiadQuestionModel
{
    public int Id { get; set; }

    public int OlympiadId { get; set; }

    public OlympiadModel Olympiad { get; set; } = null!;

    [Required]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public ICollection<OlympiadAnswerModel> Answers { get; set; } = [];
}
