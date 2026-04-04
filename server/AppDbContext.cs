using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AccountModel> Accounts { get; set; }
    public DbSet<CourseModel> Courses { get; set; }
}