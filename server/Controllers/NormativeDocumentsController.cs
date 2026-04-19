using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/resources/documents")]
[ApiController]
[Authorize]
public class NormativeDocumentsController(AppDbContext context, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".doc",
        ".docx",
    };

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await context.NormativeDocuments
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                description = x.Description,
                url = x.Url,
                attachedFileName = x.AttachedFileName,
                createdAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var item = await context.NormativeDocuments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (item is null || string.IsNullOrWhiteSpace(item.AttachedFileRelativePath))
        {
            return NotFound(ApiResponse.Error("Файл не найден"));
        }

        var path = GetAbsolutePath(item.AttachedFileRelativePath);
        if (!System.IO.File.Exists(path))
        {
            return NotFound(ApiResponse.Error("Файл отсутствует на сервере"));
        }

        var contentType = GuessAttachmentContentType(item.AttachedFileName ?? "file");
        return PhysicalFile(path, contentType, item.AttachedFileName ?? "download");
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] UpsertResourceItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var item = new NormativeDocumentModel
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
        };

        context.NormativeDocuments.Add(item);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<CreatedResourceItemDto>.Ok(new CreatedResourceItemDto { Id = item.Id }, "Документ добавлен"));
    }

    [HttpPost("{id:int}/file")]
    [Authorize(Roles = "admin")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> UploadFile(int id)
    {
        var item = await context.NormativeDocuments.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Запись не найдена"));
        }

        if (Request.Form.Files.Count == 0)
        {
            return BadRequest(ApiResponse.Error("Не передан файл"));
        }

        var formFile = Request.Form.Files[0];
        if (formFile.Length <= 0)
        {
            return BadRequest(ApiResponse.Error("Пустой файл"));
        }

        var originalName = Path.GetFileName(formFile.FileName);
        var ext = Path.GetExtension(originalName);
        if (string.IsNullOrEmpty(ext) || !AllowedAttachmentExtensions.Contains(ext))
        {
            return BadRequest(ApiResponse.Error("Разрешены только файлы PDF, DOC или DOCX"));
        }

        await DeletePhysicalAttachmentAsync(item, saveAfter: false);

        var uploadRoot = Path.Combine(env.ContentRootPath, "uploads", "resources", "documents", id.ToString());
        Directory.CreateDirectory(uploadRoot);
        var safeName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(uploadRoot, safeName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await formFile.CopyToAsync(stream);
        }

        item.AttachedFileName = originalName;
        item.AttachedFileRelativePath =
            Path.Combine("uploads", "resources", "documents", id.ToString(), safeName).Replace("\\", "/");
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Файл прикреплён"));
    }

    [HttpDelete("{id:int}/file")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteAttachedFile(int id)
    {
        var item = await context.NormativeDocuments.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Запись не найдена"));
        }

        await DeletePhysicalAttachmentAsync(item, saveAfter: true);

        return Ok(ApiResponse.Ok("Файл удалён"));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await context.NormativeDocuments.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Документ не найден"));
        }

        await DeletePhysicalAttachmentAsync(item, saveAfter: false);
        context.NormativeDocuments.Remove(item);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Документ удалён"));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertResourceItemDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var item = await context.NormativeDocuments.FindAsync(id);
        if (item is null)
        {
            return NotFound(ApiResponse.Error("Документ не найден"));
        }

        item.Title = dto.Title.Trim();
        item.Description = dto.Description.Trim();
        item.Url = string.IsNullOrWhiteSpace(dto.Url) ? null : dto.Url.Trim();
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Документ обновлён"));
    }

    private string GetAbsolutePath(string relative) =>
        Path.Combine(env.ContentRootPath, relative.Replace("/", Path.DirectorySeparatorChar.ToString()));

    private async Task DeletePhysicalAttachmentAsync(NormativeDocumentModel item, bool saveAfter)
    {
        if (string.IsNullOrWhiteSpace(item.AttachedFileRelativePath))
        {
            return;
        }

        var path = GetAbsolutePath(item.AttachedFileRelativePath);
        if (System.IO.File.Exists(path))
        {
            System.IO.File.Delete(path);
        }

        item.AttachedFileRelativePath = null;
        item.AttachedFileName = null;
        if (saveAfter)
        {
            await context.SaveChangesAsync();
        }
    }

    private static string GuessAttachmentContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream",
        };
    }
}
