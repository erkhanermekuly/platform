using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class NormativeDocumentModel
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(3000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Url { get; set; }

    [MaxLength(260)]
    public string? AttachedFileName { get; set; }

    [MaxLength(512)]
    public string? AttachedFileRelativePath { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
