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
            await EnsureNormativeDocumentsAttachedFileColumnsAsync(db, cancellationToken);
            await EnsureEventScenariosTableAsync(db, cancellationToken);
            await EnsureAdditionalMaterialsTableAsync(db, cancellationToken);
            await EnsureAdditionalMaterialsAttachedFileColumnsAsync(db, cancellationToken);
            await EnsureOlympiadsTablesAsync(db, cancellationToken);
            await EnsureOlympiadAttemptsTableAsync(db, cancellationToken);
            await EnsureOlympiadAttemptsExtraColumnsAsync(db, cancellationToken);
            await EnsureAccountsIsBlockedAsync(db, cancellationToken);
            await EnsureCoursesExtendedColumnsAsync(db, cancellationToken);
            await EnsureLearningsAccessExpiresAsync(db, cancellationToken);
            await EnsurePaymentsExtendedColumnsAsync(db, cancellationToken);
            await EnsureAuditLogsTableAsync(db, cancellationToken);
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
                `AttachedFileName` varchar(260) CHARACTER SET utf8mb4 NULL,
                `AttachedFileRelativePath` varchar(512) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_NormativeDocuments` PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);
    }

    private static async Task EnsureNormativeDocumentsAttachedFileColumnsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "NormativeDocuments", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "NormativeDocuments", "AttachedFileName", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `NormativeDocuments` ADD COLUMN `AttachedFileName` varchar(260) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "NormativeDocuments", "AttachedFileRelativePath", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `NormativeDocuments` ADD COLUMN `AttachedFileRelativePath` varchar(512) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }
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
                `AttachedFileName` varchar(260) CHARACTER SET utf8mb4 NULL,
                `AttachedFileRelativePath` varchar(512) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_AdditionalMaterials` PRIMARY KEY (`Id`)
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);
    }

    private static async Task EnsureAdditionalMaterialsAttachedFileColumnsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "AdditionalMaterials", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "AdditionalMaterials", "AttachedFileName", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `AdditionalMaterials` ADD COLUMN `AttachedFileName` varchar(260) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "AdditionalMaterials", "AttachedFileRelativePath", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `AdditionalMaterials` ADD COLUMN `AttachedFileRelativePath` varchar(512) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }
    }

    private static async Task EnsureOlympiadsTablesAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Olympiads", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `Olympiads` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `Title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                    `Description` varchar(3000) CHARACTER SET utf8mb4 NOT NULL,
                    `Image` varchar(1024) CHARACTER SET utf8mb4 NULL,
                    `CreatedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    CONSTRAINT `PK_Olympiads` PRIMARY KEY (`Id`)
                ) CHARACTER SET=utf8mb4;
                """,
                cancellationToken);
        }

        if (!await TableExistsAsync(db, "OlympiadQuestions", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `OlympiadQuestions` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `OlympiadId` int NOT NULL,
                    `Text` varchar(2000) CHARACTER SET utf8mb4 NOT NULL,
                    `SortOrder` int NOT NULL,
                    CONSTRAINT `PK_OlympiadQuestions` PRIMARY KEY (`Id`),
                    CONSTRAINT `FK_OlympiadQuestions_Olympiads_OlympiadId`
                        FOREIGN KEY (`OlympiadId`) REFERENCES `Olympiads` (`Id`) ON DELETE CASCADE
                ) CHARACTER SET=utf8mb4;
                """,
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                "CREATE INDEX `IX_OlympiadQuestions_OlympiadId` ON `OlympiadQuestions` (`OlympiadId`);",
                cancellationToken);
        }

        if (!await TableExistsAsync(db, "OlympiadAnswers", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `OlympiadAnswers` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `QuestionId` int NOT NULL,
                    `Text` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
                    `IsCorrect` tinyint(1) NOT NULL DEFAULT 0,
                    `SortOrder` int NOT NULL,
                    CONSTRAINT `PK_OlympiadAnswers` PRIMARY KEY (`Id`),
                    CONSTRAINT `FK_OlympiadAnswers_OlympiadQuestions_QuestionId`
                        FOREIGN KEY (`QuestionId`) REFERENCES `OlympiadQuestions` (`Id`) ON DELETE CASCADE
                ) CHARACTER SET=utf8mb4;
                """,
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                "CREATE INDEX `IX_OlympiadAnswers_QuestionId` ON `OlympiadAnswers` (`QuestionId`);",
                cancellationToken);
        }
    }

    private static async Task EnsureOlympiadAttemptsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "OlympiadAttempts", cancellationToken))
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `OlympiadAttempts` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `AccountId` int NOT NULL,
                `OlympiadId` int NOT NULL,
                `TotalQuestions` int NOT NULL,
                `CorrectCount` int NOT NULL,
                `ScorePercent` int NOT NULL,
                `BonusPoints` int NOT NULL DEFAULT 0,
                `IsVoided` tinyint(1) NOT NULL DEFAULT 0,
                `SubmittedAtUtc` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT `PK_OlympiadAttempts` PRIMARY KEY (`Id`),
                CONSTRAINT `FK_OlympiadAttempts_Accounts_AccountId`
                    FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_OlympiadAttempts_Olympiads_OlympiadId`
                    FOREIGN KEY (`OlympiadId`) REFERENCES `Olympiads` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX `IX_OlympiadAttempts_AccountId_OlympiadId_SubmittedAtUtc` ON `OlympiadAttempts` (`AccountId`, `OlympiadId`, `SubmittedAtUtc`);",
            cancellationToken);
    }

    private static async Task EnsureAccountsIsBlockedAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Accounts", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "Accounts", "IsBlocked", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Accounts` ADD COLUMN `IsBlocked` tinyint(1) NOT NULL DEFAULT 0;",
                cancellationToken);
        }
    }

    private static async Task EnsureCoursesExtendedColumnsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Courses", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "Courses", "IsPublished", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Courses` ADD COLUMN `IsPublished` tinyint(1) NOT NULL DEFAULT 1;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "Courses", "CatalogSortOrder", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Courses` ADD COLUMN `CatalogSortOrder` int NOT NULL DEFAULT 0;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "Courses", "FreePreviewLessonCount", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Courses` ADD COLUMN `FreePreviewLessonCount` int NOT NULL DEFAULT 0;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "Courses", "AccessDurationDays", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Courses` ADD COLUMN `AccessDurationDays` int NULL;",
                cancellationToken);
        }
    }

    private static async Task EnsureLearningsAccessExpiresAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Learnings", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "Learnings", "AccessExpiresAtUtc", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Learnings` ADD COLUMN `AccessExpiresAtUtc` datetime(6) NULL;",
                cancellationToken);
        }
    }

    private static async Task EnsurePaymentsExtendedColumnsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Payments", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "Payments", "ExternalId", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Payments` ADD COLUMN `ExternalId` varchar(200) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "Payments", "ReceiptUrl", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Payments` ADD COLUMN `ReceiptUrl` varchar(1024) CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "Payments", "MetadataJson", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `Payments` ADD COLUMN `MetadataJson` longtext CHARACTER SET utf8mb4 NULL;",
                cancellationToken);
        }
    }

    private static async Task EnsureOlympiadAttemptsExtraColumnsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "OlympiadAttempts", cancellationToken))
        {
            return;
        }

        if (!await ColumnExistsAsync(db, "OlympiadAttempts", "BonusPoints", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `OlympiadAttempts` ADD COLUMN `BonusPoints` int NOT NULL DEFAULT 0;",
                cancellationToken);
        }

        if (!await ColumnExistsAsync(db, "OlympiadAttempts", "IsVoided", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE `OlympiadAttempts` ADD COLUMN `IsVoided` tinyint(1) NOT NULL DEFAULT 0;",
                cancellationToken);
        }
    }

    private static async Task EnsureAuditLogsTableAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "AuditLogs", cancellationToken))
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `AuditLogs` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `AccountId` int NULL,
                `ActorEmail` varchar(191) CHARACTER SET utf8mb4 NOT NULL,
                `HttpMethod` varchar(16) CHARACTER SET utf8mb4 NOT NULL,
                `Path` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
                `StatusCode` int NOT NULL,
                `Details` varchar(2000) CHARACTER SET utf8mb4 NULL,
                `CreatedAtUtc` datetime(6) NOT NULL,
                CONSTRAINT `PK_AuditLogs` PRIMARY KEY (`Id`),
                CONSTRAINT `FK_AuditLogs_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE SET NULL
            ) CHARACTER SET=utf8mb4;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX `IX_AuditLogs_CreatedAtUtc` ON `AuditLogs` (`CreatedAtUtc`);",
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
