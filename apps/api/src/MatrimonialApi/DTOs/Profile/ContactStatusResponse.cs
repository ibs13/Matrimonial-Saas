namespace MatrimonialApi.DTOs.Profile;

public class ContactStatusResponse
{
    public bool IsUnlocked { get; set; }
    public bool CanUnlock { get; set; }

    /// <summary>
    /// Set when CanUnlock is false.
    /// Values: "NoPlan" | "NoAcceptedInterest" | "OwnProfile"
    /// </summary>
    public string? BlockReason { get; set; }

    // Contact fields — only populated when IsUnlocked = true
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? GuardianPhone { get; set; }
    public string? PresentAddress { get; set; }
    public string? PermanentAddress { get; set; }
}
