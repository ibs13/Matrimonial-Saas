namespace MatrimonialApi.DTOs.Admin;

public class PendingProfileItem
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? Gender { get; set; }
    public string? Religion { get; set; }
    public int? AgeYears { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }
    public int CompletionPercentage { get; set; }
    public DateTime SubmittedAt { get; set; }
}
