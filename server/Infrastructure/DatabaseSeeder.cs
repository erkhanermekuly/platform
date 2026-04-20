using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Infrastructure;

/// <summary>
/// Заполняет БД демо-данными, если таблица курсов пуста (идемпотентно).
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedIfEmptyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        if (await context.Courses.AnyAsync(cancellationToken))
        {
            await SeedResourcesIfEmptyAsync(context, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return;
        }

        var admin = CreateAccount("Иван Иванов", "ivan@example.com", "admin");

        var teacher = CreateAccount("Мария Учитель", "maria@example.com", "teacher");

        context.Accounts.AddRange(admin, teacher);
        await context.SaveChangesAsync(cancellationToken);

        var courses = BuildCourses(admin);
        context.Courses.AddRange(courses);
        await context.SaveChangesAsync(cancellationToken);

        foreach (var course in courses)
        {
            var order = 1;
            foreach (var module in course.Modules.OrderBy(m => m.SortOrder))
            {
                var isFirst = order == 1;
                context.CourseLessons.Add(new CourseLessonModel
                {
                    CourseId = course.Id,
                    Title = module.Title,
                    Description = $"План модуля: {module.Lessons} занятий, {module.Duration}",
                    SortOrder = order,
                    VideoUrl = isFirst ? course.VideoUrl : null,
                });
                order++;
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        context.CourseFiles.AddRange(
            new CourseFileModel
            {
                CourseId = courses[0].Id,
                Name = "Методические рекомендации.pdf",
                Type = "pdf",
                RelativePath = "",
                SizeBytes = 0,
                UploadedAt = DateTime.UtcNow.AddDays(-4),
            },
            new CourseFileModel
            {
                CourseId = courses[0].Id,
                Name = "Шаблон плана занятия.docx",
                Type = "docx",
                RelativePath = "",
                SizeBytes = 0,
                UploadedAt = DateTime.UtcNow.AddDays(-3),
            });

        context.Learnings.AddRange(
            new LearningModel
            {
                AccountId = admin.Id,
                CourseId = courses[0].Id,
                Progress = 65,
                LastAccessed = DateTime.UtcNow.AddDays(-2),
            },
            new LearningModel
            {
                AccountId = teacher.Id,
                CourseId = courses[0].Id,
                Progress = 20,
                LastAccessed = DateTime.UtcNow.AddDays(-1),
            });

        context.Reviews.Add(
            new ReviewModel
            {
                AccountId = admin.Id,
                CourseId = courses[0].Id,
                Rating = 5,
                Text = "Отличный курс! Очень понятно объяснено",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
            });

        context.Payments.Add(
            new PaymentModel
            {
                AccountId = admin.Id,
                CourseId = courses[0].Id,
                Amount = 0,
                Status = "completed",
                Provider = "kaspi",
                TransactionId = "KSP-DEMO-000001",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                PaidAt = DateTime.UtcNow.AddDays(-2),
            });

        await SeedResourcesIfEmptyAsync(context, cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedResourcesIfEmptyAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        if (!await context.NormativeDocuments.AnyAsync(cancellationToken))
        {
            context.NormativeDocuments.AddRange(
                new NormativeDocumentModel
                {
                    Title = "Типовая образовательная программа ДО",
                    Description = "Базовые требования к содержанию, условиям и результатам дошкольного образования.",
                    Url = "https://adilet.zan.kz/rus",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2),
                },
                new NormativeDocumentModel
                {
                    Title = "Санитарные требования для ДО",
                    Description = "Краткий ориентир по санитарным нормам организации образовательной среды.",
                    Url = "https://adilet.zan.kz/rus",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }

        if (!await context.EventScenarios.AnyAsync(cancellationToken))
        {
            context.EventScenarios.AddRange(
                new EventScenarioModel
                {
                    Title = "Сценарий утренника «Осенний бал»",
                    Description = "Пошаговый план с распределением ролей, музыкальными паузами и реквизитом.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-3),
                },
                new EventScenarioModel
                {
                    Title = "Сценарий тематического дня «Безопасность»",
                    Description = "Интерактивные задания и мини-игры для закрепления правил безопасности.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }

        if (!await context.AdditionalMaterials.AnyAsync(cancellationToken))
        {
            context.AdditionalMaterials.AddRange(
                new AdditionalMaterialModel
                {
                    Title = "Шаблон недельного плана занятий",
                    Description = "Готовый шаблон для быстрого планирования занятий и развивающих активностей.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2),
                },
                new AdditionalMaterialModel
                {
                    Title = "Карточки для развития речи",
                    Description = "Подборка карточек и упражнений для групповой и индивидуальной работы.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }
    }

    private static AccountModel CreateAccount(string name, string email, string role) =>
        new()
        {
            Name = name,
            Email = email,
            Role = role,
            Avatar = string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
        };

    private static List<CourseModel> BuildCourses(AccountModel author) =>
    [
        new()
        {
            Title = "Основы дошкольного образования",
            Description = "Полный курс для учителей, начинающих работать в детском саду",
            Category = "beginner",
            Level = "beginner",
            Price = 0,
            IsLocked = false,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1503672260482-696c7ebc5cb2?w=400",
            InstructorName = "Елена Петрова",
            InstructorAvatar = null,
            InstructorBio = "Методист по дошкольному образованию",
            Rating = 4.8,
            Students = 12540,
            Duration = "40 часов",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Введение", Lessons = 5, Duration = "2 часа", SortOrder = 1 },
                new() { Title = "Возрастная педагогика", Lessons = 10, Duration = "8 часов", SortOrder = 2 },
                new() { Title = "Практика занятий", Lessons = 8, Duration = "7 часов", SortOrder = 3 },
            ],
        },
        new()
        {
            Title = "Развитие речи у дошкольников",
            Description = "Продвинутые техники работы с развитием речи",
            Category = "advanced",
            Level = "advanced",
            Price = 2999,
            IsLocked = true,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1516534775068-bb61e764cd12?w=400",
            InstructorName = "Максим Кулаков",
            InstructorAvatar = null,
            InstructorBio = "Педагог-дефектолог",
            Rating = 4.7,
            Students = 5420,
            Duration = "50 часов",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Речевая диагностика", Lessons = 7, Duration = "6 часов", SortOrder = 1 },
                new() { Title = "Техники развития", Lessons = 8, Duration = "7 часов", SortOrder = 2 },
                new() { Title = "Практика", Lessons = 6, Duration = "5 часов", SortOrder = 3 },
            ],
        },
        new()
        {
            Title = "Творческие занятия и арт-терапия",
            Description = "Интерактивные методы обучения через искусство",
            Category = "intermediate",
            Level = "intermediate",
            Price = 1999,
            IsLocked = true,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
            InstructorName = "Ольга Иванова",
            InstructorAvatar = null,
            InstructorBio = "Преподаватель арт-терапии",
            Rating = 4.6,
            Students = 7210,
            Duration = "35 часов",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Основы арт-подхода", Lessons = 6, Duration = "4 часа", SortOrder = 1 },
                new() { Title = "Методики творчества", Lessons = 8, Duration = "6 часов", SortOrder = 2 },
                new() { Title = "Групповые занятия", Lessons = 5, Duration = "5 часов", SortOrder = 3 },
            ],
        },
    ];
}
