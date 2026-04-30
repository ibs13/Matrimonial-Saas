using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.Models;

public class InterestRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public Guid ReceiverId { get; set; }
    public User Receiver { get; set; } = null!;

    public InterestRequestStatus Status { get; set; } = InterestRequestStatus.Pending;

    /// <summary>Optional short note sent with the interest request.</summary>
    public string? Message { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}
