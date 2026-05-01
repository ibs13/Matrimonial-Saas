using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.Models;

public class ProfileReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ReporterId { get; set; }
    public User Reporter { get; set; } = null!;

    public Guid ReportedUserId { get; set; }
    public User ReportedUser { get; set; } = null!;

    public ReportReason Reason { get; set; }

    public string? Description { get; set; }

    /// <summary>Active | Dismissed</summary>
    public string Status { get; set; } = "Active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
