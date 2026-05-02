using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.Models;

public class UserMembership
{
    public Guid UserId { get; set; }
    public MembershipPlan Plan { get; set; } = MembershipPlan.Free;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Null means the plan never expires (always true for Free).</summary>
    public DateTime? ExpiresAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
