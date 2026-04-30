using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateEducationInfoRequest
{
    [Required]
    public EducationLevel Level { get; set; }

    [MaxLength(100)]
    public string? FieldOfStudy { get; set; }

    [MaxLength(150)]
    public string? Institution { get; set; }

    [Range(1970, 2100)]
    public int? GraduationYear { get; set; }

    [MaxLength(500)]
    public string? AdditionalQualifications { get; set; }
}
