using MatrimonialApi.Models.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MatrimonialApi.Models.Mongo;

public class Profile
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; }

    public ProfileStatus Status { get; set; } = ProfileStatus.Draft;
    public ProfileVisibility Visibility { get; set; } = new();

    /// <summary>0–100. Recalculated on every save.</summary>
    public int CompletionPercentage { get; set; } = 0;

    public BasicInfo? Basic { get; set; }
    public PhysicalInfo? Physical { get; set; }
    public EducationInfo? Education { get; set; }
    public CareerInfo? Career { get; set; }
    public FamilyInfo? Family { get; set; }
    public ReligionInfo? Religion { get; set; }
    public LifestyleInfo? Lifestyle { get; set; }
    public PartnerExpectations? PartnerExpectations { get; set; }
    public List<ProfilePhoto> Photos { get; set; } = [];

    /// <summary>All contact fields are hidden by default per privacy rules.</summary>
    public ContactInfo? Contact { get; set; }

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime? LastActiveAt { get; set; }
}

public class ProfileVisibility
{
    /// <summary>Full legal name — hidden until connection is accepted.</summary>
    public bool ShowFullName { get; set; } = false;

    /// <summary>Phone numbers — hidden until connection is accepted.</summary>
    public bool ShowPhone { get; set; } = false;

    /// <summary>Home address — hidden until connection is accepted.</summary>
    public bool ShowAddress { get; set; } = false;

    /// <summary>Whether this profile appears in search results.</summary>
    public bool ProfileVisible { get; set; } = true;
}

public class BasicInfo
{
    /// <summary>Shown publicly (first name or nickname). Required.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Legal full name — hidden per visibility rules.</summary>
    public string? FullName { get; set; }

    // Nullable so completion service can detect whether the user has set these
    public Gender? Gender { get; set; }

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime? DateOfBirth { get; set; }

    public Religion? Religion { get; set; }
    public MaritalStatus? MaritalStatus { get; set; }
    public string Nationality { get; set; } = "Bangladeshi";
    public string MotherTongue { get; set; } = "Bengali";
    public string CountryOfResidence { get; set; } = string.Empty;

    /// <summary>Bangladesh administrative division (Dhaka, Chittagong, etc.).</summary>
    public string? Division { get; set; }

    public string? District { get; set; }
    public string? AboutMe { get; set; }
}

public class PhysicalInfo
{
    /// <summary>Height in centimetres.</summary>
    public int? HeightCm { get; set; }

    /// <summary>Weight in kilograms.</summary>
    public int? WeightKg { get; set; }

    public BodyType? BodyType { get; set; }
    public Complexion? Complexion { get; set; }

    /// <summary>ABO+Rh format, e.g. "A+".</summary>
    public string? BloodGroup { get; set; }

    public bool HasPhysicalDisability { get; set; } = false;
    public string? PhysicalDisabilityDetails { get; set; }
}

public class EducationInfo
{
    // Nullable so completion service detects whether user has set this
    public EducationLevel? Level { get; set; }
    public string? FieldOfStudy { get; set; }
    public string? Institution { get; set; }
    public int? GraduationYear { get; set; }
    public string? AdditionalQualifications { get; set; }
}

public class CareerInfo
{
    // Nullable so completion service detects whether user has set this
    public EmploymentType? EmploymentType { get; set; }
    public string? Occupation { get; set; }
    public string? Organization { get; set; }

    /// <summary>Annual income in the specified currency (default BDT).</summary>
    public decimal? AnnualIncome { get; set; }

    /// <summary>ISO 4217 currency code.</summary>
    public string IncomeCurrency { get; set; } = "BDT";
}

public class FamilyInfo
{
    public string? FatherOccupation { get; set; }
    public string? MotherOccupation { get; set; }
    public int NumberOfBrothers { get; set; } = 0;
    public int NumberOfSisters { get; set; } = 0;
    public FamilyStatus? FamilyStatus { get; set; }
    public FamilyType? FamilyType { get; set; }
    public string? FamilyCountry { get; set; }
    public string? FamilyDivision { get; set; }
    public string? FamilyDistrict { get; set; }
    public string? AboutFamily { get; set; }
}

public class ReligionInfo
{
    public IslamicSect? Sect { get; set; }
    public PrayerHabit? PrayerHabit { get; set; }

    /// <summary>For female profiles.</summary>
    public bool? WearsHijab { get; set; }

    /// <summary>For male profiles.</summary>
    public bool? WearsBeard { get; set; }

    public string? Mazhab { get; set; }
}

public class LifestyleInfo
{
    public DietType? Diet { get; set; }
    public SmokingHabit? Smoking { get; set; }
    public List<string> Hobbies { get; set; } = [];
}

public class PartnerExpectations
{
    public int? AgeMin { get; set; }
    public int? AgeMax { get; set; }

    /// <summary>Minimum acceptable height in centimetres.</summary>
    public int? HeightMinCm { get; set; }

    /// <summary>Maximum acceptable height in centimetres.</summary>
    public int? HeightMaxCm { get; set; }

    public EducationLevel? MinEducationLevel { get; set; }
    public List<MaritalStatus> AcceptedMaritalStatuses { get; set; } = [];
    public List<Religion> AcceptedReligions { get; set; } = [];
    public List<string> PreferredCountries { get; set; } = [];
    public FamilyStatus? MinFamilyStatus { get; set; }
    public string? AdditionalExpectations { get; set; }
}

public class ProfilePhoto
{
    public string Url { get; set; } = string.Empty;
    public bool IsProfilePhoto { get; set; } = false;

    /// <summary>If false, visible only to accepted connections.</summary>
    public bool IsPublic { get; set; } = false;

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class ContactInfo
{
    /// <summary>Hidden. Revealed only when ShowPhone is true.</summary>
    public string? Phone { get; set; }

    /// <summary>Guardian/wali phone — for female profiles.</summary>
    public string? GuardianPhone { get; set; }

    /// <summary>Hidden. Revealed only when ShowAddress is true.</summary>
    public string? PresentAddress { get; set; }

    public string? PermanentAddress { get; set; }
}
