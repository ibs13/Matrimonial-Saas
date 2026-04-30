using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateContactInfoRequest
{
    [Phone, MaxLength(20)]
    public string? Phone { get; set; }

    [Phone, MaxLength(20)]
    public string? GuardianPhone { get; set; }

    [MaxLength(300)]
    public string? PresentAddress { get; set; }

    [MaxLength(300)]
    public string? PermanentAddress { get; set; }
}
