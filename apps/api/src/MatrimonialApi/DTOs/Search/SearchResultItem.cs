using MatrimonialApi.DTOs.Profile;

namespace MatrimonialApi.DTOs.Search;

/// <summary>
/// Public-safe search result row — contains only indexed fields.
/// No hidden fields (full name, phone, address) are included.
/// </summary>
public class SearchResultItem
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int? AgeYears { get; set; }
    public string? Religion { get; set; }
    public string? MaritalStatus { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }
    public string? District { get; set; }
    public string? EducationLevel { get; set; }
    public string? EmploymentType { get; set; }
    public int? HeightCm { get; set; }
    public int CompletionPercentage { get; set; }
    public DateTime? LastActiveAt { get; set; }
    /// <summary>Only set when the profile has an Approved + Public photo.</summary>
    public string? PhotoUrl { get; set; }
    public VerificationBadgesDto Badges { get; set; } = new();
}
