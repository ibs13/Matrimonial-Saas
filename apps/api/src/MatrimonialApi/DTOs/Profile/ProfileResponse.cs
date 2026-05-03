using MatrimonialApi.Models.Enums;
using MatrimonialApi.Models.Mongo;

namespace MatrimonialApi.DTOs.Profile;

public class ProfileResponse
{
    public Guid Id { get; set; }
    public ProfileStatus Status { get; set; }
    public ProfileVisibility Visibility { get; set; } = new();
    public int CompletionPercentage { get; set; }

    /// <summary>Age derived from DateOfBirth at response time.</summary>
    public int? AgeYears { get; set; }

    public BasicInfo? Basic { get; set; }
    public PhysicalInfo? Physical { get; set; }
    public EducationInfo? Education { get; set; }
    public CareerInfo? Career { get; set; }
    public FamilyInfo? Family { get; set; }
    public ReligionInfo? Religion { get; set; }
    public LifestyleInfo? Lifestyle { get; set; }
    public PartnerExpectations? PartnerExpectations { get; set; }
    public List<ProfilePhoto> Photos { get; set; } = [];
    public ContactInfo? Contact { get; set; }

    /// <summary>Fields that are not yet filled. Required ones block submission.</summary>
    public List<ProfileCompletionField> MissingFields { get; set; } = [];

    public VerificationBadgesDto Badges { get; set; } = new();

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastActiveAt { get; set; }
}
