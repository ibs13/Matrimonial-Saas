using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.Models;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public MembershipPlan Plan { get; set; }
    public decimal AmountBdt { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public int DurationDays { get; set; } = 30;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    public ICollection<PaymentAttempt> PaymentAttempts { get; set; } = [];
}
