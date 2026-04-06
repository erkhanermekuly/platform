using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Infrastructure;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        if (await context.Courses.AnyAsync())
        {
            return;
        }

        var demoUser = new AccountModel
        {
            Name = "Иван Иванов",
            Email = "ivan@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
            Avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
        };

        context.Accounts.Add(demoUser);

        var courses = new List<CourseModel>
        {
            new()
            {
                Title = "Основы JavaScript",
                Description = "Полный курс по JavaScript от основ до продвинутых концепций",
                Category = "programming",
                Level = "beginner",
                Price = 0,
                Image = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500",
                InstructorName = "Иван Петров",
                InstructorAvatar = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
                InstructorBio = "Senior frontend разработчик и ментор",
                Rating = 4.8,
                Students = 12540,
                Duration = "40 часов",
                Modules =
                [
                    new() { Title = "Введение", Lessons = 5, Duration = "2 часа", SortOrder = 1 },
                    new() { Title = "Основы языка", Lessons = 10, Duration = "8 часов", SortOrder = 2 },
                    new() { Title = "Работа с DOM", Lessons = 8, Duration = "7 часов", SortOrder = 3 }
                ]
            },
            new()
            {
                Title = "React для начинающих",
                Description = "Научитесь создавать интерактивные приложения с React",
                Category = "programming",
                Level = "beginner",
                Price = 0,
                Image = "https://images.unsplash.com/photo-1633356542981-dfe60bb9a36f?w=500",
                InstructorName = "Сергей Иванов",
                InstructorAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                InstructorBio = "Опытный React разработчик с 10-летним стажем",
                Rating = 4.9,
                Students = 8932,
                Duration = "30 часов",
                Modules =
                [
                    new() { Title = "Введение в React", Lessons = 5, Duration = "2 часа", SortOrder = 1 },
                    new() { Title = "Компоненты и JSX", Lessons = 8, Duration = "4 часа", SortOrder = 2 },
                    new() { Title = "Хуки и State Management", Lessons = 10, Duration = "6 часов", SortOrder = 3 },
                    new() { Title = "Маршрутизация и API", Lessons = 7, Duration = "5 часов", SortOrder = 4 },
                    new() { Title = "Финальный проект", Lessons = 3, Duration = "8 часов", SortOrder = 5 }
                ]
            },
            new()
            {
                Title = "Node.js для профессионалов",
                Description = "Продвинутые техники разработки серверных приложений",
                Category = "programming",
                Level = "advanced",
                Price = 299,
                Image = "https://images.unsplash.com/photo-1516321318423-f06f70504c11?w=500",
                InstructorName = "Александр Соколов",
                InstructorAvatar = "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200",
                InstructorBio = "Backend архитектор, Node.js эксперт",
                Rating = 4.7,
                Students = 5420,
                Duration = "50 часов",
                Modules =
                [
                    new() { Title = "Архитектура Node.js", Lessons = 7, Duration = "6 часов", SortOrder = 1 },
                    new() { Title = "Express и middleware", Lessons = 8, Duration = "7 часов", SortOrder = 2 },
                    new() { Title = "Тестирование и деплой", Lessons = 6, Duration = "5 часов", SortOrder = 3 }
                ]
            },
            new()
            {
                Title = "UI/UX Дизайн",
                Description = "Полное руководство по созданию красивых интерфейсов",
                Category = "design",
                Level = "intermediate",
                Price = 199,
                Image = "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500",
                InstructorName = "Мария Козлова",
                InstructorAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                InstructorBio = "UI/UX дизайнер, продуктовый исследователь",
                Rating = 4.6,
                Students = 7210,
                Duration = "35 часов",
                Modules =
                [
                    new() { Title = "Основы UX", Lessons = 6, Duration = "4 часа", SortOrder = 1 },
                    new() { Title = "UI-паттерны", Lessons = 8, Duration = "6 часов", SortOrder = 2 },
                    new() { Title = "Проектирование прототипа", Lessons = 5, Duration = "5 часов", SortOrder = 3 }
                ]
            }
        };

        context.Courses.AddRange(courses);
        await context.SaveChangesAsync();

        var reactCourse = courses[1];

        context.Learnings.AddRange(
            new LearningModel
            {
                AccountId = demoUser.Id,
                CourseId = courses[0].Id,
                Progress = 65,
                LastAccessed = DateTime.UtcNow.AddDays(-2)
            },
            new LearningModel
            {
                AccountId = demoUser.Id,
                CourseId = reactCourse.Id,
                Progress = 45,
                LastAccessed = DateTime.UtcNow.AddDays(-3)
            });

        context.Reviews.AddRange(
            new ReviewModel
            {
                AccountId = demoUser.Id,
                CourseId = reactCourse.Id,
                Rating = 5,
                Text = "Отличный курс! Очень понятно объяснено",
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            },
            new ReviewModel
            {
                AccountId = demoUser.Id,
                CourseId = reactCourse.Id,
                Rating = 4,
                Text = "Хорошее содержание, но хотелось бы больше практики",
                CreatedAt = DateTime.UtcNow.AddDays(-14)
            });

        await context.SaveChangesAsync();
    }
}
