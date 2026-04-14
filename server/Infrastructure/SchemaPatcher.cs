using Microsoft.EntityFrameworkCore;

namespace server.Infrastructure;

/// <summary>
/// EnsureCreated не обновляет существующую схему MySQL — добавляем таблицы/колонки идемпотентно.
/// </summary>
public static class SchemaPatcher
{
    public static async Task ApplyAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);
        try
        {
            await EnsureCourseLessonsTableAsync(db, cancellationToken);
            await EnsureLessonCompletionsTableAsync(db, cancellationToken);
            await EnsureCourseFilesLessonIdAsync(db, cancellationToken);
            await EnsureNormativeDocumentsTableAsync(db, cancellationToken);
            await EnsureEventScenariosTableAsync(db, cancellationToken);
            await EnsureAdditionalMaterialsTableAsync(db, cancellationToken);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    private static async Task EnsureCourseLessonsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var exists = await TableExistsAsync(db, "CourseLessons", cancellationToken);
        if (exists)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `CourseLessons` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `CourseId` int NOT NULL,
                `Title` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
                `Description` varchar(4000) CHARACTER SET utf8mb4 NOT NULL,
                `SortOrder` int NOT NULL,
                `VideoUrl` varchar(1024) CHARACTER SET utf8mb4 NULL,
                CONSTRAINT `PK_CourseLessons` PRIMARY KEY (`Id`),
                CONSTRAINT `FK_CourseLessons_Courses_CourseId` FOREIGN KEY (`CourseId`) REFERENCES `Courses` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX `IX_CourseLessons_CourseId` ON `CourseLessons` (`CourseId`);",
            cancellationToken);
    }

    private static async Task EnsureLessonCompletionsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var exists = await TableExistsAsync(db, "LessonCompletions", cancellationToken);
        if (exists)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `LessonCompletions` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `AccountId` int NOT NULL,
                `CourseLessonId` int NOT NULL,
                `CompletedAtUtc` datetime(6) NOT NULL,
                CONSTRAINT `PK_LessonCompletions` PRIMARY KEY (`Id`),
                CONSTRAINT `FK_LessonCompletions_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_LessonCompletions_CourseLessons_CourseLessonId` FOREIGN KEY (`CourseLessonId`) REFERENCES `CourseLessons` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX `IX_LessonCompletions_AccountId_CourseLessonId` ON `LessonCompletions` (`AccountId`, `CourseLessonId`);",
            cancellationToken);
    }

    private static async Task EnsureCourseFilesLessonIdAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var hasColumn = await ColumnExistsAsync(db, "CourseFiles", "LessonId", cancellationToken);
        if (hasColumn)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE `CourseFiles` ADD COLUMN `LessonId` int NULL;",
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE `CourseFiles`
            ADD CONSTRAINT `FK_CourseFiles_CourseLessons_LessonId`
            FOREIGN KEY (`LessonId`) REFERENCES `CourseLessons` (`Id`) ON DELETE SET NULL;
            """,
            cancellationToken);
    }

    private static async Task EnsureNormativeDocumentsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var exists = await TableExistsAsync(db, "NormativeDocuments", cancellationToken);
        if (exists)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `NormativeDocuments` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                `Description` varchar(3000) CHARACTER SET utf8mb4 NOT NULL,
                `Url` varchar(1024) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_NormativeDocuments` PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);
    }

    private static async Task EnsureEventScenariosTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var exists = await TableExistsAsync(db, "EventScenarios", cancellationToken);
        if (exists)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `EventScenarios` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                `Description` varchar(3000) CHARACTER SET utf8mb4 NOT NULL,
                `Url` varchar(1024) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_EventScenarios` PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);
    }

    private static async Task EnsureAdditionalMaterialsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var exists = await TableExistsAsync(db, "AdditionalMaterials", cancellationToken);
        if (exists)
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `AdditionalMaterials` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                `Description` varchar(3000) CHARACTER SET utf8mb4 NOT NULL,
                `Url` varchar(1024) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_AdditionalMaterials` PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);
    }

    private static async Task<bool> TableExistsAsync(AppDbContext db, string tableName, CancellationToken cancellationToken)
    {
        await using var cmd = db.Database.GetDbConnection().CreateCommand();
        cmd.CommandText =
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = @p0";
        var p = cmd.CreateParameter();
        p.ParameterName = "@p0";
        p.Value = tableName;
        cmd.Parameters.Add(p);
        var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt64(scalar) > 0;
    }

    private static async Task<bool> ColumnExistsAsync(AppDbContext db, string table, string column, CancellationToken cancellationToken)
    {
        await using var cmd = db.Database.GetDbConnection().CreateCommand();
        cmd.CommandText =
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = @t AND column_name = @c
            """;
        var pt = cmd.CreateParameter();
        pt.ParameterName = "@t";
        pt.Value = table;
        cmd.Parameters.Add(pt);
        var pc = cmd.CreateParameter();
        pc.ParameterName = "@c";
        pc.Value = column;
        cmd.Parameters.Add(pc);
        var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt64(scalar) > 0;
    }
}
