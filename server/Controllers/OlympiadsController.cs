using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using server.DTOs;
using server.Infrastructure;
using server.Models;
using System.Linq;
using System.Security.Claims;
using System.Text;

namespace server.Controllers;

[Route("api/olympiads")]
[ApiController]
[Authorize]
public class OlympiadsController(AppDbContext context, IConfiguration configuration) : ControllerBase
{
    private bool IsAdmin => User.IsInRole("admin");

    private int? GetUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawId, out var userId) ? userId : null;
    }

    /// <summary>Итоговый балл для рейтинга: базовый процент + бонусы, в диапазоне 0–100.</summary>
    private static int ComputeRatingScore(int scorePercent, int bonusPoints) =>
        Math.Clamp(scorePercent + bonusPoints, 0, 100);

    // ─── Олимпиады ───────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = GetUserId();
        HashSet<int>? completedOlympiadIds = null;
        if (userId is int uid)
        {
            completedOlympiadIds = (await context.OlympiadAttempts
                .AsNoTracking()
                .Where(a => a.AccountId == uid && !a.IsVoided)
                .Select(a => a.OlympiadId)
                .Distinct()
                .ToListAsync())
                .ToHashSet();
        }

        var items = await context.Olympiads
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                x.Image,
                x.CreatedAtUtc,
                questionsCount = x.Questions.Count
            })
            .ToListAsync();

        var mapped = items.Select(x => new
        {
            id = x.Id,
            title = x.Title,
            description = x.Description,
            image = x.Image,
            createdAtUtc = x.CreatedAtUtc,
            questionsCount = x.questionsCount,
            myCompleted = completedOlympiadIds?.Contains(x.Id) ?? false
        }).ToList();

        return Ok(ApiResponse<object>.Ok(mapped));
    }

    [HttpGet("my-results")]
    public async Task<IActionResult> MyResults()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var attempts = await context.OlympiadAttempts
            .AsNoTracking()
            .Where(x => x.AccountId == userId.Value)
            .Include(x => x.Olympiad)
            .OrderByDescending(x => x.SubmittedAtUtc)
            .ToListAsync();

        var payload = attempts.Select(x => new
        {
            id = x.Id,
            olympiadId = x.OlympiadId,
            olympiadTitle = x.Olympiad != null ? x.Olympiad.Title : "Олимпиада",
            totalQuestions = x.TotalQuestions,
            correctCount = x.CorrectCount,
            scorePercent = x.ScorePercent,
            bonusPoints = x.BonusPoints,
            isVoided = x.IsVoided,
            ratingScore = ComputeRatingScore(x.ScorePercent, x.BonusPoints),
            submittedAtUtc = x.SubmittedAtUtc
        }).ToList();

        return Ok(ApiResponse<object>.Ok(payload));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var meta = await context.Olympiads.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
        if (meta is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var userId = GetUserId();

        // Не-админ с действующей попыткой: только сводка, без вопросов (повторное прохождение запрещено).
        if (!IsAdmin && userId is int uid)
        {
            var lastAttempt = await context.OlympiadAttempts
                .AsNoTracking()
                .Where(a => a.OlympiadId == id && a.AccountId == uid && !a.IsVoided)
                .OrderByDescending(a => a.SubmittedAtUtc)
                .FirstOrDefaultAsync();

            if (lastAttempt is not null)
            {
                return Ok(ApiResponse<object>.Ok(new
                {
                    locked = true,
                    olympiad = new
                    {
                        id = meta.Id,
                        title = meta.Title,
                        description = meta.Description,
                        image = meta.Image,
                        createdAtUtc = meta.CreatedAtUtc,
                    },
                    attempt = new
                    {
                        id = lastAttempt.Id,
                        scorePercent = lastAttempt.ScorePercent,
                        correctCount = lastAttempt.CorrectCount,
                        totalQuestions = lastAttempt.TotalQuestions,
                        bonusPoints = lastAttempt.BonusPoints,
                        ratingScore = ComputeRatingScore(lastAttempt.ScorePercent, lastAttempt.BonusPoints),
                        submittedAtUtc = lastAttempt.SubmittedAtUtc,
                    },
                    questions = Array.Empty<object>(),
                }));
            }
        }

        var olympiad = await context.Olympiads
            .AsNoTracking()
            .Include(o => o.Questions.OrderBy(q => q.SortOrder).ThenBy(q => q.Id))
                .ThenInclude(q => q.Answers.OrderBy(a => a.SortOrder).ThenBy(a => a.Id))
            .FirstOrDefaultAsync(o => o.Id == id);

        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var isAdmin = IsAdmin;

        var result = new
        {
            locked = false,
            id = olympiad.Id,
            title = olympiad.Title,
            description = olympiad.Description,
            image = olympiad.Image,
            createdAtUtc = olympiad.CreatedAtUtc,
            questions = olympiad.Questions.Select(q => new
            {
                id = q.Id,
                text = q.Text,
                sortOrder = q.SortOrder,
                answers = q.Answers.Select(a => new
                {
                    id = a.Id,
                    text = a.Text,
                    sortOrder = a.SortOrder,
                    // Правильные ответы видит только админ
                    isCorrect = isAdmin ? (bool?)a.IsCorrect : null
                })
            })
        };

        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpGet("{id:int}/documents/participation-certificate")]
    public async Task<IActionResult> DownloadParticipationCertificate(int id)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var attempt = await context.OlympiadAttempts
            .AsNoTracking()
            .Include(a => a.Olympiad)
            .Where(a => a.OlympiadId == id && a.AccountId == userId && !a.IsVoided)
            .OrderByDescending(a => a.SubmittedAtUtc)
            .FirstOrDefaultAsync();

        if (attempt is null || attempt.Olympiad is null)
        {
            return NotFound(ApiResponse.Error("Нет сохранённой попытки по этой олимпиаде."));
        }

        var account = await context.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == userId);
        var fullName = string.IsNullOrWhiteSpace(account?.Name)
            ? User.FindFirstValue(ClaimTypes.Name) ?? "Участник"
            : account!.Name;

        var label = configuration["Certificate:PlatformLabel"];
        if (string.IsNullOrWhiteSpace(label))
        {
            label = "LearnHub";
        }

        var pdf = OlympiadDocumentsPdf.GenerateParticipationCertificate(
            fullName,
            attempt.Olympiad.Title,
            attempt.SubmittedAtUtc,
            label);

        return File(pdf, "application/pdf", $"olympiad-{id}-certificate-participation.pdf");
    }

    [HttpGet("{id:int}/documents/diploma")]
    public async Task<IActionResult> DownloadDiploma(int id)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        var attempt = await context.OlympiadAttempts
            .AsNoTracking()
            .Include(a => a.Olympiad)
            .Where(a => a.OlympiadId == id && a.AccountId == userId && !a.IsVoided)
            .OrderByDescending(a => a.SubmittedAtUtc)
            .FirstOrDefaultAsync();

        if (attempt is null || attempt.Olympiad is null)
        {
            return NotFound(ApiResponse.Error("Нет сохранённой попытки по этой олимпиаде."));
        }

        var account = await context.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == userId);
        var fullName = string.IsNullOrWhiteSpace(account?.Name)
            ? User.FindFirstValue(ClaimTypes.Name) ?? "Участник"
            : account!.Name;

        var label = configuration["Certificate:PlatformLabel"];
        if (string.IsNullOrWhiteSpace(label))
        {
            label = "LearnHub";
        }

        var ratingScore = ComputeRatingScore(attempt.ScorePercent, attempt.BonusPoints);
        var pdf = OlympiadDocumentsPdf.GenerateDiploma(
            fullName,
            attempt.Olympiad.Title,
            attempt.CorrectCount,
            attempt.TotalQuestions,
            attempt.ScorePercent,
            ratingScore,
            attempt.SubmittedAtUtc,
            label);

        return File(pdf, "application/pdf", $"olympiad-{id}-diploma.pdf");
    }

    /// <summary>Рейтинг по олимпиаде: лучшие попытки участников (аннулированные не учитываются).</summary>
    [HttpGet("{id:int}/rating")]
    public async Task<IActionResult> Rating(int id, [FromQuery] int take = 50)
    {
        var exists = await context.Olympiads.AsNoTracking().AnyAsync(o => o.Id == id);
        if (!exists)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        if (take < 1) take = 1;
        if (take > 200) take = 200;

        var attempts = await context.OlympiadAttempts
            .AsNoTracking()
            .Where(a => a.OlympiadId == id && !a.IsVoided)
            .Include(a => a.Account)
            .ToListAsync();

        var ordered = attempts
            .Select(a => new
            {
                attempt = a,
                rating = ComputeRatingScore(a.ScorePercent, a.BonusPoints),
            })
            .OrderByDescending(x => x.rating)
            .ThenBy(x => x.attempt.SubmittedAtUtc)
            .Take(take)
            .ToList();

        var ranked = ordered.Select((x, idx) => new
        {
            rank = idx + 1,
            accountId = x.attempt.AccountId,
            name = x.attempt.Account?.Name ?? "Участник",
            scorePercent = x.attempt.ScorePercent,
            bonusPoints = x.attempt.BonusPoints,
            ratingScore = x.rating,
            correctCount = x.attempt.CorrectCount,
            totalQuestions = x.attempt.TotalQuestions,
            submittedAtUtc = x.attempt.SubmittedAtUtc,
        }).ToList();

        return Ok(ApiResponse<object>.Ok(ranked));
    }

    [HttpGet("{id:int}/admin/attempts")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminListAttempts(int id)
    {
        var exists = await context.Olympiads.AsNoTracking().AnyAsync(o => o.Id == id);
        if (!exists)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var attempts = await context.OlympiadAttempts
            .AsNoTracking()
            .Where(a => a.OlympiadId == id)
            .Include(a => a.Account)
            .OrderByDescending(a => a.SubmittedAtUtc)
            .ToListAsync();

        var payload = attempts.Select(a => new
        {
            id = a.Id,
            accountId = a.AccountId,
            name = a.Account?.Name,
            email = a.Account?.Email,
            totalQuestions = a.TotalQuestions,
            correctCount = a.CorrectCount,
            scorePercent = a.ScorePercent,
            bonusPoints = a.BonusPoints,
            ratingScore = ComputeRatingScore(a.ScorePercent, a.BonusPoints),
            isVoided = a.IsVoided,
            submittedAtUtc = a.SubmittedAtUtc,
        }).ToList();

        return Ok(ApiResponse<object>.Ok(payload));
    }

    [HttpGet("{id:int}/admin/attempts/export")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ExportAttemptsCsv(int id)
    {
        var olympiad = await context.Olympiads.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var rows = await context.OlympiadAttempts
            .AsNoTracking()
            .Where(a => a.OlympiadId == id)
            .Include(a => a.Account)
            .OrderByDescending(a => a.SubmittedAtUtc)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("email;name;scorePercent;correctCount;totalQuestions;bonusPoints;ratingScore;voided;submittedAtUtc");
        foreach (var a in rows)
        {
            var email = (a.Account?.Email ?? string.Empty).Replace(';', ',');
            var name = (a.Account?.Name ?? string.Empty).Replace(';', ',');
            var rating = ComputeRatingScore(a.ScorePercent, a.BonusPoints);
            sb.AppendLine(string.Join(';', email, name, a.ScorePercent, a.CorrectCount, a.TotalQuestions, a.BonusPoints, rating, a.IsVoided ? 1 : 0, a.SubmittedAtUtc.ToString("u")));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        var fileName = $"olympiad-{id}-attempts.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    [HttpPost("{id:int}/admin/attempts/{attemptId:int}/void")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminVoidAttempt(int id, int attemptId)
    {
        var attempt = await context.OlympiadAttempts
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.OlympiadId == id);

        if (attempt is null)
        {
            return NotFound(ApiResponse.Error("Попытка не найдена"));
        }

        attempt.IsVoided = true;
        await context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Попытка аннулирована. Участник сможет пройти олимпиаду снова."));
    }

    [HttpPost("{id:int}/admin/attempts/{attemptId:int}/bonus")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminAddBonus(int id, int attemptId, [FromBody] OlympiadBonusPointsDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var attempt = await context.OlympiadAttempts
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.OlympiadId == id);

        if (attempt is null)
        {
            return NotFound(ApiResponse.Error("Попытка не найдена"));
        }

        var next = attempt.BonusPoints + dto.Points;
        attempt.BonusPoints = Math.Clamp(next, -100, 100);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            bonusPoints = attempt.BonusPoints,
            ratingScore = ComputeRatingScore(attempt.ScorePercent, attempt.BonusPoints),
        }, "Бонусные баллы обновлены"));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] OlympiadUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var olympiad = new OlympiadModel
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Image = string.IsNullOrWhiteSpace(dto.Image) ? null : dto.Image.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Olympiads.Add(olympiad);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = olympiad.Id }, "Олимпиада создана"));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] OlympiadUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        var olympiad = await context.Olympiads.FindAsync(id);
        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        olympiad.Title = dto.Title.Trim();
        olympiad.Description = dto.Description.Trim();
        olympiad.Image = string.IsNullOrWhiteSpace(dto.Image) ? null : dto.Image.Trim();

        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Олимпиада обновлена"));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var olympiad = await context.Olympiads.FindAsync(id);
        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        context.Olympiads.Remove(olympiad);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Олимпиада удалена"));
    }

    // ─── Вопросы ────────────────────────────────────────────────

    [HttpGet("{id:int}/questions")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ListQuestions(int id)
    {
        var exists = await context.Olympiads.AsNoTracking().AnyAsync(o => o.Id == id);
        if (!exists)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var questions = await context.OlympiadQuestions
            .AsNoTracking()
            .Where(q => q.OlympiadId == id)
            .Include(q => q.Answers)
            .OrderBy(q => q.SortOrder)
            .ThenBy(q => q.Id)
            .Select(q => new
            {
                id = q.Id,
                text = q.Text,
                sortOrder = q.SortOrder,
                answers = q.Answers
                    .OrderBy(a => a.SortOrder)
                    .ThenBy(a => a.Id)
                    .Select(a => new
                    {
                        id = a.Id,
                        text = a.Text,
                        isCorrect = a.IsCorrect,
                        sortOrder = a.SortOrder
                    })
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(questions));
    }

    [HttpPost("{id:int}/questions")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateQuestion(int id, [FromBody] OlympiadQuestionUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        if (dto.Answers.Count < 2)
        {
            return BadRequest(ApiResponse.Error("Должно быть минимум 2 варианта ответа"));
        }

        if (!dto.Answers.Any(a => a.IsCorrect))
        {
            return BadRequest(ApiResponse.Error("Отметьте хотя бы один правильный ответ"));
        }

        var olympiad = await context.Olympiads.FindAsync(id);
        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var question = new OlympiadQuestionModel
        {
            OlympiadId = id,
            Text = dto.Text.Trim(),
            SortOrder = dto.SortOrder,
            Answers = dto.Answers.Select((a, idx) => new OlympiadAnswerModel
            {
                Text = a.Text.Trim(),
                IsCorrect = a.IsCorrect,
                SortOrder = a.SortOrder == 0 ? idx : a.SortOrder
            }).ToList()
        };

        context.OlympiadQuestions.Add(question);
        await context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = question.Id }, "Вопрос добавлен"));
    }

    [HttpPut("{id:int}/questions/{questionId:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateQuestion(int id, int questionId, [FromBody] OlympiadQuestionUpsertDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Error("Некорректные данные"));
        }

        if (dto.Answers.Count < 2)
        {
            return BadRequest(ApiResponse.Error("Должно быть минимум 2 варианта ответа"));
        }

        if (!dto.Answers.Any(a => a.IsCorrect))
        {
            return BadRequest(ApiResponse.Error("Отметьте хотя бы один правильный ответ"));
        }

        var question = await context.OlympiadQuestions
            .Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.OlympiadId == id);

        if (question is null)
        {
            return NotFound(ApiResponse.Error("Вопрос не найден"));
        }

        question.Text = dto.Text.Trim();
        question.SortOrder = dto.SortOrder;

        // Полностью заменяем варианты ответа (проще и безопаснее)
        context.OlympiadAnswers.RemoveRange(question.Answers);
        question.Answers = dto.Answers.Select((a, idx) => new OlympiadAnswerModel
        {
            Text = a.Text.Trim(),
            IsCorrect = a.IsCorrect,
            SortOrder = a.SortOrder == 0 ? idx : a.SortOrder
        }).ToList();

        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Вопрос обновлён"));
    }

    [HttpDelete("{id:int}/questions/{questionId:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteQuestion(int id, int questionId)
    {
        var question = await context.OlympiadQuestions
            .FirstOrDefaultAsync(q => q.Id == questionId && q.OlympiadId == id);

        if (question is null)
        {
            return NotFound(ApiResponse.Error("Вопрос не найден"));
        }

        context.OlympiadQuestions.Remove(question);
        await context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Вопрос удалён"));
    }

    // ─── Проверка решения ───────────────────────────────────────

    [HttpPost("{id:int}/submit")]
    [EnableRateLimiting("olympiad-submit")]
    public async Task<IActionResult> Submit(int id, [FromBody] OlympiadSubmissionDto dto)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Error("Пользователь не авторизован"));
        }

        if (!IsAdmin && userId is int uidBlock)
        {
            var alreadyCompleted = await context.OlympiadAttempts
                .AnyAsync(a => a.OlympiadId == id && a.AccountId == uidBlock && !a.IsVoided);

            if (alreadyCompleted)
            {
                return BadRequest(ApiResponse.Error("Вы уже прошли эту олимпиаду. Повторное прохождение недоступно."));
            }
        }

        var olympiad = await context.Olympiads
            .AsNoTracking()
            .Include(o => o.Questions)
                .ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (olympiad is null)
        {
            return NotFound(ApiResponse.Error("Олимпиада не найдена"));
        }

        var totalQuestions = olympiad.Questions.Count;
        if (totalQuestions == 0)
        {
            return BadRequest(ApiResponse.Error("В олимпиаде пока нет вопросов"));
        }

        var submissionByQuestion = dto.Answers
            .GroupBy(a => a.QuestionId)
            .ToDictionary(g => g.Key, g => g.SelectMany(x => x.SelectedAnswerIds).ToHashSet());

        var perQuestion = olympiad.Questions.Select(q =>
        {
            var correctIds = q.Answers.Where(a => a.IsCorrect).Select(a => a.Id).ToHashSet();
            var selected = submissionByQuestion.TryGetValue(q.Id, out var s) ? s : new HashSet<int>();

            var isCorrect = correctIds.SetEquals(selected);

            return new
            {
                questionId = q.Id,
                isCorrect,
                correctAnswerIds = correctIds.ToList(),
                selectedAnswerIds = selected.ToList()
            };
        }).ToList();

        var correctCount = perQuestion.Count(x => x.isCorrect);
        var scorePercent = (int)Math.Round(correctCount * 100.0 / totalQuestions);

        int? attemptId = null;
        var bonusPoints = 0;
        if (!IsAdmin)
        {
            var row = new OlympiadAttemptModel
            {
                AccountId = userId.Value,
                OlympiadId = olympiad.Id,
                TotalQuestions = totalQuestions,
                CorrectCount = correctCount,
                ScorePercent = scorePercent,
                BonusPoints = 0,
                IsVoided = false,
                SubmittedAtUtc = DateTime.UtcNow
            };
            context.OlympiadAttempts.Add(row);
            await context.SaveChangesAsync();
            attemptId = row.Id;
        }

        var ratingScore = ComputeRatingScore(scorePercent, bonusPoints);

        return Ok(ApiResponse<object>.Ok(new
        {
            totalQuestions,
            correctCount,
            scorePercent,
            bonusPoints,
            ratingScore,
            attemptId,
            previewOnly = IsAdmin,
            results = perQuestion
        }));
    }
}
