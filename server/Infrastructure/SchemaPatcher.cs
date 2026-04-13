using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using server;

namespace server.Infrastructure;

/// <summary>
/// При использовании EnsureCreated() существующая БД не получает новые таблицы.
/// Добавляем недостающие таблицы и колонки идемпотентно (MySQL).
/// </summary>
public static class SchemaPatcher
{
    public static async Task ApplyAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        try
        {
            await db.Database.OpenConnectionAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "SchemaPatcher: не удалось открыть соединение с БД");
            return;
        }

        try
        {
            var conn = db.Database.GetDbConnection();

            if (!await TableExistsAsync(conn, "CourseLessons", ct))
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    CREATE TABLE `CourseLessons` (
                      `Id` int NOT NULL AUTO_INCREMENT,
                      `CourseId` int NOT NULL,
                      `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                      `Description` varchar(4000) CHARACTER SET utf8mb4 NOT NULL,
                      `VideoUrl` varchar(1024) CHARACTER SET utf8mb4 NULL,
                      `SortOrder` int NOT NULL,
                      PRIMARY KEY (`Id`),
                      KEY `IX_CourseLessons_CourseId` (`CourseId`),
                      CONSTRAINT `FK_CourseLessons_Courses_CourseId` FOREIGN KEY (`CourseId`) REFERENCES `Courses` (`Id`) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    """,
                    cancellationToken: ct);
                logger.LogInformation("SchemaPatcher: создана таблица CourseLessons");
            }

            if (!await TableExistsAsync(conn, "LessonCompletions", ct))
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    CREATE TABLE `LessonCompletions` (
                      `Id` int NOT NULL AUTO_INCREMENT,
                      `AccountId` int NOT NULL,
                      `CourseId` int NOT NULL,
                      `LessonId` int NOT NULL,
                      `CompletedAt` datetime(6) NOT NULL,
                      PRIMARY KEY (`Id`),
                      UNIQUE KEY `IX_LessonCompletions_AccountId_LessonId` (`AccountId`,`LessonId`),
                      KEY `IX_LessonCompletions_CourseId` (`CourseId`),
                      KEY `IX_LessonCompletions_LessonId` (`LessonId`),
                      CONSTRAINT `FK_LessonCompletions_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE,
                      CONSTRAINT `FK_LessonCompletions_Courses_CourseId` FOREIGN KEY (`CourseId`) REFERENCES `Courses` (`Id`) ON DELETE CASCADE,
                      CONSTRAINT `FK_LessonCompletions_CourseLessons_LessonId` FOREIGN KEY (`LessonId`) REFERENCES `CourseLessons` (`Id`) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    """,
                    cancellationToken: ct);
                logger.LogInformation("SchemaPatcher: создана таблица LessonCompletions");
            }

            if (!await ColumnExistsAsync(conn, "CourseFiles", "LessonId", ct))
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    ALTER TABLE `CourseFiles` ADD COLUMN `LessonId` int NULL;
                    ALTER TABLE `CourseFiles` ADD KEY `IX_CourseFiles_LessonId` (`LessonId`);
                    ALTER TABLE `CourseFiles` ADD CONSTRAINT `FK_CourseFiles_CourseLessons_LessonId` FOREIGN KEY (`LessonId`) REFERENCES `CourseLessons` (`Id`) ON DELETE CASCADE;
                    """,
                    cancellationToken: ct);
                logger.LogInformation("SchemaPatcher: в CourseFiles добавлена колонка LessonId");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SchemaPatcher: ошибка применения патчей схемы");
        }
        finally
        {
            try
            {
                await db.Database.CloseConnectionAsync();
            }
            catch
            {
                // ignore
            }
        }
    }

    private static async Task<bool> TableExistsAsync(DbConnection conn, string table, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = @t
            """;
        AddParam(cmd, "@t", table);
        var scalar = await cmd.ExecuteScalarAsync(ct);
        return Convert.ToInt32(scalar) > 0;
    }

    private static async Task<bool> ColumnExistsAsync(DbConnection conn, string table, string column, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = @t AND column_name = @c
            """;
        AddParam(cmd, "@t", table);
        AddParam(cmd, "@c", column);
        var scalar = await cmd.ExecuteScalarAsync(ct);
        return Convert.ToInt32(scalar) > 0;
    }

    private static void AddParam(DbCommand cmd, string name, string value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        cmd.Parameters.Add(p);
    }
}
