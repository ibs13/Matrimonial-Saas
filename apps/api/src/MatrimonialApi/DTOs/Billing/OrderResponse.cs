namespace MatrimonialApi.DTOs.Billing;

public class OrderResponse
{
    public Guid Id { get; set; }
    public string Plan { get; set; } = string.Empty;
    public decimal AmountBdt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public int AttemptCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}
