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
        // Старые демо-аккаунты из ранних сидов (ivan/maria) → admin@ / teacher@, пароль 123456
        await SyncLegacyDemoAccountsAsync(context, cancellationToken);

        if (await context.Courses.AnyAsync(cancellationToken))
        {
            await SeedResourcesIfEmptyAsync(context, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return;
        }

        var admin = CreateAccount("Нұрлан Серікұлы", "admin@example.com", "admin");

        var teacher = CreateAccount("Айгүл Мұратқызы", "teacher@example.com", "teacher");

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
                    Description = $"Модуль жоспары: {module.Lessons} сабақ, {module.Duration}",
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
                Name = "Әдістемелік ұсынымдар.pdf",
                Type = "pdf",
                RelativePath = "",
                SizeBytes = 0,
                UploadedAt = DateTime.UtcNow.AddDays(-4),
            },
            new CourseFileModel
            {
                CourseId = courses[0].Id,
                Name = "Сабақ жоспарының үлгісі.docx",
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
                Text = "Керемет курс! Мазмұны өте түсінікті берілген",
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
                    Title = "Мектеп жасына дейінгі білім берудің үлгілік оқу бағдарламасы",
                    Description = "Мазмұны, шарттары мен нәтижелері бойынша мектеп жасына дейінгі білім беруге қойылатын негізгі талаптар.",
                    Url = "https://adilet.zan.kz",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2),
                },
                new NormativeDocumentModel
                {
                    Title = "Мектеп жасына дейінгі ұйымдарға санитариялық талаптар",
                    Description = "Білім беру ортасын ұйымдастырудағы санитариялық нормаларға қысқаша бағдар.",
                    Url = "https://adilet.zan.kz",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }

        if (!await context.EventScenarios.AnyAsync(cancellationToken))
        {
            context.EventScenarios.AddRange(
                new EventScenarioModel
                {
                    Title = "Таңертеңгілік «Күзгі бал» сценарийі",
                    Description = "Рөлдерді бөлу, музыкалық үзілімдер және реквизит бойынша қадамдық жоспар.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-3),
                },
                new EventScenarioModel
                {
                    Title = "Тақырыптық күн «Қауіпсіздік» сценарийі",
                    Description = "Қауіпсіздік ережелерін бекітуге арналған интерактивті тапсырмалар мен мини-ойындар.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }

        if (!await context.AdditionalMaterials.AnyAsync(cancellationToken))
        {
            context.AdditionalMaterials.AddRange(
                new AdditionalMaterialModel
                {
                    Title = "Апталық сабақтар жоспарының үлгісі",
                    Description = "Сабақтар мен дамытушылық белсенділіктерді жылдам жоспарлауға дайын үлгі.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2),
                },
                new AdditionalMaterialModel
                {
                    Title = "Сөйлеуді дамытуға арналған карточкалар",
                    Description = "Топтық және жеке жұмыс үшін карточкалар мен жаттығулар жинағы.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }

        if (!await context.Consultations.AnyAsync(cancellationToken))
        {
            context.Consultations.AddRange(
                new ConsultationModel
                {
                    Title = "Консультация по адаптации детей раннего возраста",
                    Description = "Практические рекомендации по мягкой адаптации и взаимодействию с родителями.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2),
                },
                new ConsultationModel
                {
                    Title = "Консультация для родителей по поддержке речи",
                    Description = "Памятка с упражнениями и советами для развития речи в домашних условиях.",
                    Url = null,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                });
        }
    }

    /// <summary>
    /// Однократно приводит старые сиды к новым email/именам, если в БД ещё есть ivan@ / maria@.
    /// </summary>
    private static async Task SyncLegacyDemoAccountsAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        const string demoPassword = "123456";
        var hash = BCrypt.Net.BCrypt.HashPassword(demoPassword);

        await TryMigrateLegacyEmailAsync(
            context,
            fromEmail: "ivan@example.com",
            toEmail: "admin@example.com",
            name: "Нұрлан Серікұлы",
            role: "admin",
            passwordHash: hash,
            cancellationToken);

        await TryMigrateLegacyEmailAsync(
            context,
            fromEmail: "maria@example.com",
            toEmail: "teacher@example.com",
            name: "Айгүл Мұратқызы",
            role: "teacher",
            passwordHash: hash,
            cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task TryMigrateLegacyEmailAsync(
        AppDbContext context,
        string fromEmail,
        string toEmail,
        string name,
        string role,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        var legacy = await context.Accounts.FirstOrDefaultAsync(
            a => a.Email == fromEmail,
            cancellationToken);
        if (legacy == null)
            return;

        var emailTaken = await context.Accounts.AnyAsync(
            a => a.Email == toEmail && a.Id != legacy.Id,
            cancellationToken);
        if (emailTaken)
            return;

        legacy.Email = toEmail;
        legacy.Name = name;
        legacy.Role = role;
        legacy.PasswordHash = passwordHash;
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
            Title = "Мектеп жасына дейінгі білім берудің негіздері",
            Description = "Балабақшада жұмыс бастайтын педагогтерге арналған толық курс",
            Category = "beginner",
            Level = "beginner",
            Price = 0,
            IsLocked = false,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1503672260482-696c7ebc5cb2?w=400",
            InstructorName = "Динара Қасымова",
            InstructorAvatar = null,
            InstructorBio = "Мектеп жасына дейінгі білім беру бойынша әдіскер",
            Rating = 4.8,
            Students = 12540,
            Duration = "40 сағат",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Кіріспе", Lessons = 5, Duration = "2 сағат", SortOrder = 1 },
                new() { Title = "Жас ерекшелігіне сай педагогика", Lessons = 10, Duration = "8 сағат", SortOrder = 2 },
                new() { Title = "Сабақ практикасы", Lessons = 8, Duration = "7 сағат", SortOrder = 3 },
            ],
        },
        new()
        {
            Title = "Балалардың сөйлеуін дамыту",
            Description = "Сөйлеуді дамыту бойынша тереңдетілген әдістемелер",
            Category = "advanced",
            Level = "advanced",
            Price = 2999,
            IsLocked = true,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1516534775068-bb61e764cd12?w=400",
            InstructorName = "Ерлан Бекмұратов",
            InstructorAvatar = null,
            InstructorBio = "Педагог-дефектолог",
            Rating = 4.7,
            Students = 5420,
            Duration = "50 сағат",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Сөйлеу диагностикасы", Lessons = 7, Duration = "6 сағат", SortOrder = 1 },
                new() { Title = "Дамыту техникалары", Lessons = 8, Duration = "7 сағат", SortOrder = 2 },
                new() { Title = "Практика", Lessons = 6, Duration = "5 сағат", SortOrder = 3 },
            ],
        },
        new()
        {
            Title = "Шығармашылық сабақтар және арт-терапия",
            Description = "Өнер арқылы оқытудың интерактивті әдістері",
            Category = "intermediate",
            Level = "intermediate",
            Price = 1999,
            IsLocked = true,
            VideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
            Image = "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
            InstructorName = "Сәуле Нұрғалиева",
            InstructorAvatar = null,
            InstructorBio = "Арт-терапия педагогы",
            Rating = 4.6,
            Students = 7210,
            Duration = "35 сағат",
            CreatedByAccount = author,
            Modules =
            [
                new() { Title = "Арт-подходтың негіздері", Lessons = 6, Duration = "4 сағат", SortOrder = 1 },
                new() { Title = "Шығармашылық әдістемелері", Lessons = 8, Duration = "6 сағат", SortOrder = 2 },
                new() { Title = "Топтық сабақтар", Lessons = 5, Duration = "5 сағат", SortOrder = 3 },
            ],
        },
    ];
}
