using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using server.DTOs;
using server.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace server.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController(AppDbContext context, IConfiguration config, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedDiplomaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
    };

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        if (await context.Accounts.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(ApiResponse.Error("Пользователь с таким email уже существует"));
        }

        // Публичная регистрация — только студент; роли admin/teacher задаёт администратор (курсы на сервере — только admin).
        var account = new AccountModel
        {
            Name = dto.Name,
            Email = dto.Email,
            Role = "student",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        context.Accounts.Add(account);
        await context.SaveChangesAsync();

        var token = GenerateJwtToken(account);

        return Ok(ApiResponse<object>.Ok(new
        {
            token,
            user = new
            {
                id = account.Id,
                name = account.Name,
                email = account.Email,
                role = account.Role
            }
        }));
    }

    [HttpPost("login")]
    [HttpPost]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var account = await context.Accounts.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (account is null || !BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
        {
            return Unauthorized(ApiResponse.Error("Неверный email или пароль"));
        }

        if (account.IsBlocked)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Error("Учётная запись заблокирована. Обратитесь к администратору."));
        }

        var token = GenerateJwtToken(account);

        return Ok(ApiResponse<object>.Ok(new
        {
            token,
            user = new
            {
                id = account.Id,
                name = account.Name,
                email = account.Email,
                role = account.Role
            }
        }));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(ApiResponse.Ok("Вы успешно вышли из системы"));
    }

    [HttpGet("me")]
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var account = await context.Accounts.FindAsync(userId);
        if (account is null)
        {
            return NotFound(ApiResponse.Error("Пользователь не найден"));
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            id = account.Id,
            name = account.Name,
            email = account.Email,
            role = account.Role,
            isBlocked = account.IsBlocked,
        }));
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateMeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные профиля"));
        }

        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var account = await context.Accounts.FindAsync(userId);
        if (account is null)
        {
            return NotFound(ApiResponse.Error("Пользователь не найден"));
        }

        var normalizedEmail = dto.Email.Trim();
        var normalizedName = dto.Name.Trim();

        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return BadRequest(ApiResponse.Error("Имя не может быть пустым"));
        }

        var emailTaken = await context.Accounts.AnyAsync(a => a.Email == normalizedEmail && a.Id != userId);
        if (emailTaken)
        {
            return BadRequest(ApiResponse.Error("Пользователь с таким email уже существует"));
        }

        var newPassword = string.IsNullOrWhiteSpace(dto.NewPassword) ? null : dto.NewPassword.Trim();
        if (!string.IsNullOrEmpty(newPassword))
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            {
                return BadRequest(ApiResponse.Error("Для смены пароля укажите текущий пароль"));
            }

            var currentOk = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, account.PasswordHash);
            if (!currentOk)
            {
                return BadRequest(ApiResponse.Error("Текущий пароль указан неверно"));
            }

            account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        }

        account.Name = normalizedName;
        account.Email = normalizedEmail;

        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            id = account.Id,
            name = account.Name,
            email = account.Email,
            role = account.Role,
            isBlocked = account.IsBlocked,
        }, "Профиль обновлён"));
    }

    [HttpGet("me/diplomas")]
    [Authorize]
    public async Task<IActionResult> ListMyDiplomas()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var items = await context.UserDiplomas
            .AsNoTracking()
            .Where(x => x.AccountId == userId)
            .OrderByDescending(x => x.UploadedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                fileName = x.OriginalFileName,
                uploadedAtUtc = x.UploadedAtUtc,
                fileUrl = $"/api/auth/me/diplomas/{x.Id}/file",
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpPost("me/diplomas")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26_214_400)]
    public async Task<IActionResult> UploadMyDiploma()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        if (Request.Form.Files.Count == 0)
        {
            return BadRequest(ApiResponse.Error("Не передан файл диплома"));
        }

        var file = Request.Form.Files[0];
        if (file.Length <= 0)
        {
            return BadRequest(ApiResponse.Error("Файл пустой"));
        }

        var originalName = Path.GetFileName(file.FileName);
        var ext = Path.GetExtension(originalName);
        if (string.IsNullOrWhiteSpace(ext) || !AllowedDiplomaExtensions.Contains(ext))
        {
            return BadRequest(ApiResponse.Error("Разрешены только .jpg, .jpeg, .png"));
        }

        var userFolder = Path.Combine(env.ContentRootPath, "uploads", "portfolio", userId.ToString());
        Directory.CreateDirectory(userFolder);
        var safeName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var fullPath = Path.Combine(userFolder, safeName);

        await using (var fs = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(fs);
        }

        var model = new UserDiplomaModel
        {
            AccountId = userId,
            OriginalFileName = originalName,
            RelativePath = Path.Combine("uploads", "portfolio", userId.ToString(), safeName).Replace("\\", "/"),
            UploadedAtUtc = DateTime.UtcNow,
        };
        context.UserDiplomas.Add(model);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            id = model.Id,
            fileName = model.OriginalFileName,
            uploadedAtUtc = model.UploadedAtUtc,
            fileUrl = $"/api/auth/me/diplomas/{model.Id}/file",
        }, "Диплом загружен"));
    }

    [HttpGet("me/diplomas/{id:int}/file")]
    [Authorize]
    public async Task<IActionResult> DownloadMyDiploma(int id)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var item = await context.UserDiplomas.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.AccountId == userId);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Диплом не найден"));
        }

        var fullPath = Path.Combine(env.ContentRootPath, item.RelativePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(ApiResponse.Error("Файл отсутствует на сервере"));
        }

        return PhysicalFile(fullPath, GuessImageContentType(item.OriginalFileName), item.OriginalFileName);
    }

    [HttpDelete("me/diplomas/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteMyDiploma(int id)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var item = await context.UserDiplomas.FirstOrDefaultAsync(x => x.Id == id && x.AccountId == userId);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Диплом не найден"));
        }

        var fullPath = Path.Combine(env.ContentRootPath, item.RelativePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        context.UserDiplomas.Remove(item);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Диплом удалён"));
    }

    private string GenerateJwtToken(AccountModel account)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim(ClaimTypes.Email, account.Email),
            new Claim(ClaimTypes.Name, account.Name),
            new Claim(ClaimTypes.Role, account.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? throw new Exception("Key not installed")));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GuessImageContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream",
        };
    }

}
