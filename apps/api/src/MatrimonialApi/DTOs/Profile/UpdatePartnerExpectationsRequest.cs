using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdatePartnerExpectationsRequest
{
    [Range(18, 80)]
    public int? AgeMin { get; set; }

    [Range(18, 80)]
    public int? AgeMax { get; set; }

    [Range(100, 250)]
    public int? HeightMinCm { get; set; }

    [Range(100, 250)]
    public int? HeightMaxCm { get; set; }

    public EducationLevel? MinEducationLevel { get; set; }
    public List<MaritalStatus> AcceptedMaritalStatuses { get; set; } = [];
    public List<Religion> AcceptedReligions { get; set; } = [];
    public List<string> PreferredCountries { get; set; } = [];
    public FamilyStatus? MinFamilyStatus { get; set; }

    [MaxLength(1000)]
    public string? AdditionalExpectations { get; set; }
}
