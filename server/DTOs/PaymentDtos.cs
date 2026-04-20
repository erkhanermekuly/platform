using System.ComponentModel.DataAnnotations;

namespace server.DTOs;

public class PaymentStubCompleteDto
{
    [Range(1, int.MaxValue)]
    public int PaymentId { get; set; }
}
