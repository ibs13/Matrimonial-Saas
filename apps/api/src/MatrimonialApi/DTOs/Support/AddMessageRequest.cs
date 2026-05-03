using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Support;

public class AddMessageRequest
{
    [Required, MinLength(1), MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
}
