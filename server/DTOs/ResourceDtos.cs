using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

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
