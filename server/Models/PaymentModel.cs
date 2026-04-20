using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class PaymentModel
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public AccountModel Account { get; set; } = null!;

    public int CourseId { get; set; }

    public CourseModel Course { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Status { get; set; } = "pending";

    public string Provider { get; set; } = "kaspi";

    public string TransactionId { get; set; } = string.Empty;

    /// <summary>Идентификатор у платёжного провайдера (Stripe session / payment intent).</summary>
    [MaxLength(200)]
    public string? ExternalId { get; set; }

    /// <summary>Ссылка на чек или страницу квитанции провайдера.</summary>
    [MaxLength(1024)]
    public string? ReceiptUrl { get; set; }

    /// <summary>Служебные данные webhook (JSON).</summary>
    public string? MetadataJson { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? PaidAt { get; set; }
}
