namespace MatrimonialApi.DTOs.Profile;

public class ProfileViewerItem
{
    public Guid ViewerUserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int? AgeYears { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime ViewedAt { get; set; }
}
