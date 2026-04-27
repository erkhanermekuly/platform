namespace server.Infrastructure;

public class UrkerPaymentOptions
{
    public const string SectionName = "UrkerPayments";

    public string BaseUrl { get; set; } = string.Empty;

    public string CreateEndpoint { get; set; } = "/api/platform/payments/create";

    public string ApiKey { get; set; } = string.Empty;

    public string PublicBaseUrl { get; set; } = string.Empty;

    public string ReturnUrl { get; set; } = string.Empty;

    public string WebhookSecret { get; set; } = string.Empty;
}
