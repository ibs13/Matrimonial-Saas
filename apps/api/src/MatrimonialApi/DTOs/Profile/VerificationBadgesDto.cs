namespace MatrimonialApi.DTOs.Profile;

public class VerificationBadgesDto
{
    public bool EmailVerified { get; set; }
    public bool PhoneAdded { get; set; }
    public bool PhotoApproved { get; set; }
    public bool ProfileApproved { get; set; }
    public bool IdentityVerified { get; set; }
    public bool IsPremium { get; set; }
}
