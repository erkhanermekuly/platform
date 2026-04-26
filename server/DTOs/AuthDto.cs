using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class RegisterDto
{
    [Required]
    [MinLength(2)]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UpdateMeDto
{
    [Required]
    [MinLength(2)]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(191)]
    public string Email { get; set; } = string.Empty;

    [MinLength(6)]
    [MaxLength(100)]
    public string? CurrentPassword { get; set; }

    [MinLength(8)]
    [MaxLength(100)]
    public string? NewPassword { get; set; }
}
