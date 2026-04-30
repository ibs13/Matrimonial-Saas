using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Admin;

public class SuspendProfileRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
