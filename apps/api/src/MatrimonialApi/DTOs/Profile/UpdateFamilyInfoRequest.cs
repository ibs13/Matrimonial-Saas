using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateFamilyInfoRequest
{
    [MaxLength(100)]
    public string? FatherOccupation { get; set; }

    [MaxLength(100)]
    public string? MotherOccupation { get; set; }

    [Range(0, 20)]
    public int NumberOfBrothers { get; set; } = 0;

    [Range(0, 20)]
    public int NumberOfSisters { get; set; } = 0;

    public FamilyStatus? FamilyStatus { get; set; }
    public FamilyType? FamilyType { get; set; }

    [MaxLength(60)]
    public string? FamilyCountry { get; set; }

    [MaxLength(60)]
    public string? FamilyDivision { get; set; }

    [MaxLength(60)]
    public string? FamilyDistrict { get; set; }

    [MaxLength(1000)]
    public string? AboutFamily { get; set; }
}
