using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AccountModel> Accounts { get; set; }

    public DbSet<CourseModel> Courses { get; set; }

    public DbSet<CourseModuleModel> CourseModules { get; set; }

    public DbSet<LearningModel> Learnings { get; set; }

    public DbSet<ReviewModel> Reviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AccountModel>()
            .HasIndex(x => x.Email)
            .IsUnique();

        modelBuilder.Entity<CourseModuleModel>()
            .HasOne(x => x.Course)
            .WithMany(x => x.Modules)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

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
    }
}
