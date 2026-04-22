using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace server.Infrastructure;

public static class OlympiadDocumentsPdf
{
    static OlympiadDocumentsPdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] GenerateParticipationCertificate(
        string fullName,
        string olympiadTitle,
        DateTime submittedAtUtc,
        string platformLabel = "LearnHub")
    {
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(48);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Text("Сертификат об участии в олимпиаде")
                    .FontSize(20)
                    .SemiBold()
                    .FontColor(Colors.Teal.Darken3);

                page.Content()
                    .PaddingVertical(28)
                    .Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Text("Настоящим подтверждается, что").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().Text(fullName).FontSize(26).SemiBold();
                        col.Item().Text("принял(а) участие в олимпиаде на платформе дистанционной аттестации").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().PaddingTop(6).Text(olympiadTitle).FontSize(17).SemiBold().LineHeight(1.3f);
                        col.Item()
                            .PaddingTop(20)
                            .Text($"Дата прохождения: {submittedAtUtc:dd.MM.yyyy HH:mm} (UTC)")
                            .FontSize(10)
                            .FontColor(Colors.Grey.Medium);
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(platformLabel)
                    .FontSize(9)
                    .FontColor(Colors.Grey.Medium);
            });
        }).GeneratePdf();
    }

    public static byte[] GenerateDiploma(
        string fullName,
        string olympiadTitle,
        int correctCount,
        int totalQuestions,
        int scorePercent,
        int ratingScore,
        DateTime submittedAtUtc,
        string platformLabel = "LearnHub")
    {
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(48);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Text("Диплом")
                    .FontSize(22)
                    .SemiBold()
                    .FontColor(Colors.Indigo.Darken3);

                page.Content()
                    .PaddingVertical(24)
                    .Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Text("Награждается").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().Text(fullName).FontSize(26).SemiBold();
                        col.Item().Text("за участие в олимпиаде и следующие результаты:").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().PaddingTop(8).Text(olympiadTitle).FontSize(17).SemiBold().LineHeight(1.3f);
                        col.Item()
                            .PaddingTop(16)
                            .Text($"Верных ответов: {correctCount} из {totalQuestions}")
                            .FontSize(12);
                        col.Item().Text($"Базовый балл: {scorePercent}%").FontSize(12);
                        col.Item().Text($"Итог в рейтинге (с учётом бонусов): {ratingScore}%").FontSize(12).SemiBold();
                        col.Item()
                            .PaddingTop(18)
                            .Text($"Дата: {submittedAtUtc:dd.MM.yyyy HH:mm} (UTC)")
                            .FontSize(10)
                            .FontColor(Colors.Grey.Medium);
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(platformLabel)
                    .FontSize(9)
                    .FontColor(Colors.Grey.Medium);
            });
        }).GeneratePdf();
    }
}
