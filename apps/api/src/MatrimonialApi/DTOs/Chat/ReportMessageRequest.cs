using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Chat;

public class ReportMessageRequest
{
    [Required, MaxLength(300)]
    public string Reason { get; set; } = string.Empty;
}
