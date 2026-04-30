using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Interest;

public class SendInterestRequest
{
    [Required]
    public Guid ReceiverId { get; set; }

    /// <summary>Optional short personal note to the recipient.</summary>
    [MaxLength(300)]
    public string? Message { get; set; }
}
