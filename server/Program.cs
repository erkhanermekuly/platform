using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using server;
using server.Infrastructure;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var sentryDsn = builder.Configuration["Sentry:Dsn"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry();
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("olympiad-submit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 12,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .SetIsOriginAllowed(_ => true);
    });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new Exception("Key not installed");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// В Development Vite шлёт запросы на http://127.0.0.1:5240 — редирект на HTTPS может ломать прокси и давать «пустые» ответы.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("frontend");

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<AuditLogMiddleware>();

app.UseRateLimiter();

app.MapControllers();

var initDb =
    !app.Environment.IsEnvironment("Testing")
    && (app.Environment.IsDevelopment()
        || app.Configuration.GetValue<bool>("Seed:RunOnStartup"));

if (initDb)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var useMigrations = app.Configuration.GetValue<bool>("Database:ApplyEfMigrations");
        bool createdNew;
        if (useMigrations)
        {
            await db.Database.MigrateAsync();
            createdNew = false;
        }
        else
        {
            createdNew = await db.Database.EnsureCreatedAsync();
        }

        await SchemaPatcher.ApplyAsync(db);
        await DatabaseSeeder.SeedIfEmptyAsync(db);
        app.Logger.LogInformation(
            "БД: {Mode} (новая_схема_EnsureCreated={Created}). Сид выполнен, если не было курсов.",
            useMigrations ? "MigrateAsync + SchemaPatcher" : "EnsureCreated + SchemaPatcher",
            createdNew);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(
            ex,
            "Инициализация БД не удалась (таблицы в MySQL не появятся). Проверьте, что MySQL запущен, база platform существует и строка подключения в appsettings верна.");
    }
}

app.Run();

public partial class Program;
