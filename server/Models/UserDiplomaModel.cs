using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class UserDiplomaModel
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    [MaxLength(260)]
    public string OriginalFileName { get; set; } = string.Empty;

    [MaxLength(512)]
    public string RelativePath { get; set; } = string.Empty;

    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

    public AccountModel? Account { get; set; }
}
