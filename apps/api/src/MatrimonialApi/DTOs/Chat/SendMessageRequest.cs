using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Chat;

public class SendMessageRequest
{
    [Required, MinLength(1), MaxLength(1000)]
    public string Body { get; set; } = string.Empty;
}
