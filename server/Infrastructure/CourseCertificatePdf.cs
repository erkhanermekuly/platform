using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace server.Infrastructure;

public static class CourseCertificatePdf
{
    static CourseCertificatePdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(string fullName, string courseTitle, DateTime issuedUtc, string platformLabel = "LearnHub")
    {
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(48);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header()
                    .Text("Сертификат о прохождении курса")
                    .FontSize(20)
                    .SemiBold()
                    .FontColor(Colors.Blue.Darken3);

                page.Content()
                    .PaddingVertical(28)
                    .Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Text("Настоящим подтверждается, что").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().Text(fullName).FontSize(26).SemiBold();
                        col.Item().Text("успешно завершил(а) программу обучения").FontSize(11).FontColor(Colors.Grey.Darken2);
                        col.Item().PaddingTop(6).Text(courseTitle).FontSize(17).SemiBold().LineHeight(1.3f);
                        col.Item()
                            .PaddingTop(20)
                            .Text($"Дата выдачи: {issuedUtc:dd.MM.yyyy} (UTC)")
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
