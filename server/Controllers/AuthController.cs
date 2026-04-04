using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using server.DTOs;
using server.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace server.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController(AppDbContext _context, IConfiguration _config) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (await _context.Accounts.AnyAsync(u => u.Email == dto.Email))
            return BadRequest("User already exists");

        var account = new AccountModel
        {
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        return Ok("User created");
    }

    [HttpPost]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (account == null || !BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash))
            return Unauthorized("Invalid credentials");

        var token = GenerateJwtToken(account);

        return Ok(new { token });
    }

    private string GenerateJwtToken(AccountModel account)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim(ClaimTypes.Email, account.Email)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new Exception("Key not installed")));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
