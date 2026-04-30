using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Auth;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
