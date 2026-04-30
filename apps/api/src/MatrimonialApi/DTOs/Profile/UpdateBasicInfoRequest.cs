using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateBasicInfoRequest
{
    [Required, MinLength(2), MaxLength(60)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FullName { get; set; }

    [Required]
    public Gender Gender { get; set; }

    [Required]
    public DateTime DateOfBirth { get; set; }

    [Required]
    public Religion Religion { get; set; }

    [Required]
    public MaritalStatus MaritalStatus { get; set; }

    [MaxLength(60)]
    public string? Nationality { get; set; }

    [MaxLength(60)]
    public string? MotherTongue { get; set; }

    [Required, MaxLength(60)]
    public string CountryOfResidence { get; set; } = string.Empty;

    [MaxLength(60)]
    public string? Division { get; set; }

    [MaxLength(60)]
    public string? District { get; set; }

    [MaxLength(1000)]
    public string? AboutMe { get; set; }
}
