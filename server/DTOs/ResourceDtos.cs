using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace server.DTOs;

/// <summary>Ответ после POST создания записи каталога (id нужен для загрузки файла).</summary>
public sealed class CreatedResourceItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; init; }
}

public class UpsertResourceItemDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(3000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Url { get; set; }
}
