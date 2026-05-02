namespace MatrimonialApi.DTOs.Membership;

public class UserMembershipResponse
{
    public string Plan { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    /// <summary>-1 means unlimited.</summary>
    public int MonthlyInterestLimit { get; set; }
    public int InterestsSentThisMonth { get; set; }
    /// <summary>null when the plan has unlimited interests.</summary>
    public int? RemainingInterests { get; set; }

    public bool AdvancedSearch { get; set; }
    public bool ProfileBoost { get; set; }
    public bool ContactUnlock { get; set; }

    public decimal MonthlyPriceBdt { get; set; }
}
