using MatrimonialApi.DTOs.Profile;

namespace MatrimonialApi.DTOs.Admin;

public class AdminProfileDetailResponse
{
    public string Email { get; set; } = string.Empty;
    public ProfileResponse Profile { get; set; } = null!;
}
