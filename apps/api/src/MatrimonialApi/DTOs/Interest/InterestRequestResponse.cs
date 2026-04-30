namespace MatrimonialApi.DTOs.Interest;

public class InterestRequestResponse
{
    public Guid Id { get; set; }

    // Raw IDs so the client can navigate to either profile
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }

    // "Other person" display data from ProfileIndex — perspective-aware
    public Guid OtherUserId { get; set; }
    public string OtherDisplayName { get; set; } = string.Empty;
    public string? OtherGender { get; set; }
    public int? OtherAgeYears { get; set; }
    public string? OtherCountryOfResidence { get; set; }
    public string? OtherDivision { get; set; }

    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
