using Microsoft.Extensions.Options;
using server.DTOs;
using System.Net.Http.Headers;

namespace server.Infrastructure;

public class UrkerPaymentService(HttpClient httpClient, IOptions<UrkerPaymentOptions> options)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly UrkerPaymentOptions _options = options.Value;

    public async Task<UrkerPaymentCreateResponseDto> CreatePaymentAsync(UrkerPaymentCreateRequestDto request, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        using var message = new HttpRequestMessage(HttpMethod.Post, _options.CreateEndpoint)
        {
            Content = JsonContent.Create(request)
        };

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }

        using var response = await _httpClient.SendAsync(message, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<UrkerPaymentCreateResponseDto>(cancellationToken: cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var messageText = payload?.Message ?? $"Urker payment service error: {(int)response.StatusCode}";
            throw new InvalidOperationException(messageText);
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.RedirectUrl))
        {
            throw new InvalidOperationException("Urker payment service returned an empty payment link");
        }

        payload.Success = true;
        return payload;
    }

    public string BuildWebhookUrl() => BuildAbsoluteUrl("/api/payments/webhook/urker");

    public string ResolveReturnUrl(string? requestedReturnUrl)
    {
        if (!string.IsNullOrWhiteSpace(requestedReturnUrl))
        {
            return requestedReturnUrl;
        }

        if (!string.IsNullOrWhiteSpace(_options.ReturnUrl))
        {
            return _options.ReturnUrl;
        }

        return BuildAbsoluteUrl("/courses");
    }

    public string GetWebhookSecret()
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookSecret))
        {
            throw new InvalidOperationException("UrkerPayments:WebhookSecret is not configured");
        }

        return _options.WebhookSecret;
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            throw new InvalidOperationException("UrkerPayments:BaseUrl is not configured");
        }
    }

    private string BuildAbsoluteUrl(string path)
    {
        if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
        {
            throw new InvalidOperationException("UrkerPayments:PublicBaseUrl is not configured");
        }

        return $"{_options.PublicBaseUrl.TrimEnd('/')}{path}";
    }
}
