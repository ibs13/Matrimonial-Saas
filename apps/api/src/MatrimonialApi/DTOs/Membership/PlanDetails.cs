namespace MatrimonialApi.DTOs.Membership;

public class PlanDetails
{
    public string Plan { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;

    /// <summary>-1 means unlimited.</summary>
    public int MonthlyInterestLimit { get; set; }

    public bool AdvancedSearch { get; set; }
    public bool ProfileBoost { get; set; }
    public bool ContactUnlock { get; set; }

    public decimal MonthlyPriceBdt { get; set; }
}
