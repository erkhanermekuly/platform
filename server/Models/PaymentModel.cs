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

    public DateTime CreatedAt { get; set; }

    public DateTime? PaidAt { get; set; }
}
