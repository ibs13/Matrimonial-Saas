using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Support;

public class CreateTicketRequest
{
    [Required]
    public TicketCategory Category { get; set; }

    [Required, MaxLength(120)]
    public string Subject { get; set; } = string.Empty;

    [Required, MinLength(10), MaxLength(2000)]
    public string Body { get; set; } = string.Empty;
}
