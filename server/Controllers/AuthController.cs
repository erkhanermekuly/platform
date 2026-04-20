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
public class AuthController(AppDbContext context, IConfiguration config) : ControllerBase
{
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

}
