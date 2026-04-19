using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class OlympiadUpsertDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(3000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Image { get; set; }
}

public class OlympiadQuestionUpsertDto
{
    [Required]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    [Required]
    [MinLength(2)]
    public List<OlympiadAnswerDto> Answers { get; set; } = new();
}

public class OlympiadAnswerDto
{
    [Required]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int SortOrder { get; set; }
}

public class OlympiadSubmissionDto
{
    [Required]
    public List<OlympiadSubmissionAnswerDto> Answers { get; set; } = new();
}

public class OlympiadSubmissionAnswerDto
{
    public int QuestionId { get; set; }

    /// <summary>
    /// Идентификаторы выбранных пользователем вариантов. Поддерживает множественный выбор.
    /// </summary>
    public List<int> SelectedAnswerIds { get; set; } = new();
}
