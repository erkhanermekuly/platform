using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;
using System.Security.Claims;

namespace server.Controllers;

[Route("api/admin/users")]
[ApiController]
[Authorize(Roles = "admin")]
public class AdminUsersController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows = await context.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Email,
                a.Role,
                a.IsBlocked,
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdminUserUpdateDto dto)
    {
        var adminId = GetUserId();
        if (adminId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var account = await context.Accounts.FindAsync(id);
        if (account is null)
        {
            return NotFound(ApiResponse.Error("Пользователь не найден"));
        }

        if (id == adminId && dto.IsBlocked == true)
        {
            return BadRequest(ApiResponse.Error("Нельзя заблокировать собственную учётную запись."));
        }

        if (id == adminId && dto.Role is { } r && r != "admin")
        {
            return BadRequest(ApiResponse.Error("Нельзя снять с себя роль администратора."));
        }

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            var role = dto.Role.Trim().ToLowerInvariant();
            if (role is not ("admin" or "teacher" or "student"))
            {
                return BadRequest(ApiResponse.Error("Недопустимая роль."));
            }

            account.Role = role;
        }

        if (dto.IsBlocked.HasValue)
        {
            account.IsBlocked = dto.IsBlocked.Value;
        }

        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Данные пользователя обновлены"));
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] AdminResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var account = await context.Accounts.FindAsync(id);
        if (account is null)
        {
            return NotFound(ApiResponse.Error("Пользователь не найден"));
        }

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Пароль обновлён. Сообщите пользователю новый пароль по защищённому каналу."));
    }

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }
}
