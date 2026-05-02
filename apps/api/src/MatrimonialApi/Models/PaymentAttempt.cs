using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.Models;

public class PaymentAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    // Denormalised so admin queries don't need a double join through Orders
    public Guid UserId { get; set; }

    public decimal AmountBdt { get; set; }
    public PaymentAttemptStatus Status { get; set; } = PaymentAttemptStatus.Pending;

    // Populated by the payment gateway callback (null until a gateway is wired up)
    public string? GatewayName { get; set; }
    public string? GatewayTransactionId { get; set; }
    public string? FailureReason { get; set; }

    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
