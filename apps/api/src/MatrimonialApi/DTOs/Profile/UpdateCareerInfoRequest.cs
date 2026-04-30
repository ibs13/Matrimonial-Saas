using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateCareerInfoRequest
{
    [Required]
    public EmploymentType EmploymentType { get; set; }

    [MaxLength(100)]
    public string? Occupation { get; set; }

    [MaxLength(150)]
    public string? Organization { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? AnnualIncome { get; set; }

    [MaxLength(3)]
    public string? IncomeCurrency { get; set; }
}
