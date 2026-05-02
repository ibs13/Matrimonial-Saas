namespace MatrimonialApi.DTOs.Billing;

public class PaymentAttemptResponse
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public decimal AmountBdt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? GatewayName { get; set; }
    public string? GatewayTransactionId { get; set; }
    public string? FailureReason { get; set; }
    public DateTime AttemptedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
