using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AccountModel> Accounts { get; set; }

    public DbSet<CourseModel> Courses { get; set; }

    public DbSet<CourseModuleModel> CourseModules { get; set; }

    public DbSet<CourseLessonModel> CourseLessons { get; set; }

    public DbSet<LessonCompletionModel> LessonCompletions { get; set; }

    public DbSet<CourseFileModel> CourseFiles { get; set; }

    public DbSet<LearningModel> Learnings { get; set; }

    public DbSet<ReviewModel> Reviews { get; set; }

    public DbSet<PaymentModel> Payments { get; set; }

    public DbSet<NormativeDocumentModel> NormativeDocuments { get; set; }

    public DbSet<EventScenarioModel> EventScenarios { get; set; }

    public DbSet<AdditionalMaterialModel> AdditionalMaterials { get; set; }

    public DbSet<OlympiadModel> Olympiads { get; set; }

    public DbSet<OlympiadQuestionModel> OlympiadQuestions { get; set; }

    public DbSet<OlympiadAnswerModel> OlympiadAnswers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AccountModel>()
            .HasIndex(x => x.Email)
            .IsUnique();

        modelBuilder.Entity<CourseModel>()
            .HasOne(x => x.CreatedByAccount)
            .WithMany(x => x.CreatedCourses)
            .HasForeignKey(x => x.CreatedByAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CourseModuleModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Modules)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseLessonModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Lessons)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonCompletionModel>()
            .HasIndex(x => new { x.AccountId, x.CourseLessonId })
            .IsUnique();

        modelBuilder.Entity<LessonCompletionModel>()
            .HasOne(x => x.Account)
            .WithMany(x => x.LessonCompletions)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonCompletionModel>()
            .HasOne(x => x.CourseLesson)
            .WithMany(x => x.Completions)
            .HasForeignKey(x => x.CourseLessonId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseFileModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Files)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseFileModel>()
            .HasOne(x => x.Lesson)
            .WithMany(x => x.Files)
            .HasForeignKey(x => x.LessonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LearningModel>()
            .HasIndex(x => new { x.AccountId, x.CourseId })
            .IsUnique();

        modelBuilder.Entity<LearningModel>()
            .HasOne(x => x.Account)
            .WithMany(x => x.Enrollments)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LearningModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Enrollments)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReviewModel>()
            .HasOne(x => x.Account)
            .WithMany(x => x.Reviews)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReviewModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Reviews)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PaymentModel>()
            .HasOne(x => x.Account)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PaymentModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NormativeDocumentModel>()
            .Property(x => x.CreatedAtUtc)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<EventScenarioModel>()
            .Property(x => x.CreatedAtUtc)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<AdditionalMaterialModel>()
            .Property(x => x.CreatedAtUtc)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<OlympiadModel>()
            .Property(x => x.CreatedAtUtc)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        modelBuilder.Entity<OlympiadQuestionModel>()
            .HasOne(x => x.Olympiad)
            .WithMany(x => x.Questions)
            .HasForeignKey(x => x.OlympiadId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OlympiadAnswerModel>()
            .HasOne(x => x.Question)
            .WithMany(x => x.Answers)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
