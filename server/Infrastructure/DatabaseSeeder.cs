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
            return;

        var admin = CreateAccount(
            "Иван Иванов",
            "ivan@example.com",
            "admin",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200");

        var teacher = CreateAccount(
            "Мария Учитель",
            "maria@example.com",
            "teacher",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200");

        context.Accounts.AddRange(admin, teacher);
        await context.SaveChangesAsync(cancellationToken);

        var courses = BuildCourses(admin);
        context.Courses.AddRange(courses);
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

        await context.SaveChangesAsync(cancellationToken);
    }

    private static AccountModel CreateAccount(string name, string email, string role, string avatar) =>
        new()
        {
            Name = name,
            Email = email,
            Role = role,
            Avatar = avatar,
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
            InstructorAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
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
            InstructorAvatar = "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200",
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
            InstructorAvatar = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
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
