using System.ComponentModel.DataAnnotations;

namespace server.Models;

/// <summary>Запись о действии администратора (изменяющие запросы к API).</summary>
public class AuditLogModel
{
    public int Id { get; set; }

    public int? AccountId { get; set; }

    public AccountModel? Account { get; set; }

    [MaxLength(191)]
    public string ActorEmail { get; set; } = string.Empty;

    [MaxLength(16)]
    public string HttpMethod { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Path { get; set; } = string.Empty;

    public int StatusCode { get; set; }

    [MaxLength(2000)]
    public string? Details { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
