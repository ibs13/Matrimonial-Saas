using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdatePhysicalInfoRequest
{
    [Range(100, 250)]
    public int? HeightCm { get; set; }

    [Range(30, 300)]
    public int? WeightKg { get; set; }

    public BodyType? BodyType { get; set; }
    public Complexion? Complexion { get; set; }

    [MaxLength(5)]
    public string? BloodGroup { get; set; }

    public bool HasPhysicalDisability { get; set; } = false;

    [MaxLength(500)]
    public string? PhysicalDisabilityDetails { get; set; }
}
