namespace MatrimonialApi.DTOs.Saved;

public class SavedProfileResponse
{
    public Guid Id { get; set; }
    public Guid SavedUserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int? AgeYears { get; set; }
    public string? Religion { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }
    public string? EducationLevel { get; set; }
    public int CompletionPercentage { get; set; }
    public DateTime SavedAt { get; set; }
}
