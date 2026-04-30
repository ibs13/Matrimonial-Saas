namespace MatrimonialApi.DTOs.Profile;

public class UpdateVisibilityRequest
{
    public bool ShowFullName { get; set; } = false;
    public bool ShowPhone { get; set; } = false;
    public bool ShowAddress { get; set; } = false;
    public bool ProfileVisible { get; set; } = true;
}
