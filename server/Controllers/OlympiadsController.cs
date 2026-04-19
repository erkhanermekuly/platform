using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[Route("api/olympiads")]
[ApiController]
[Authorize]
public class OlympiadsController(AppDbContext context) : ControllerBase
{
    private bool IsAdmin => User.IsInRole("admin");

    // ─── Олимпиады ───────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await context.Olympiads
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                description = x.Description,
                image = x.Image,
                createdAtUtc = x.CreatedAtUtc,
                questionsCount = x.Questions.Count
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
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
    public async Task<IActionResult> Submit(int id, [FromBody] OlympiadSubmissionDto dto)
    {
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

        return Ok(ApiResponse<object>.Ok(new
        {
            totalQuestions,
            correctCount,
            scorePercent,
            results = perQuestion
        }));
    }
}
