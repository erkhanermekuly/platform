using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class AdminUserUpdateDto
{
    [MaxLength(20)]
    public string? Role { get; set; }

    public bool? IsBlocked { get; set; }
}

public class AdminResetPasswordDto
{
    [Required]
    [MinLength(6)]
    [MaxLength(200)]
    public string NewPassword { get; set; } = string.Empty;
}
