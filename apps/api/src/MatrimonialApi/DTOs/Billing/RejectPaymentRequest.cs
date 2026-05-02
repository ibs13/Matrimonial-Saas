using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Billing;

public class RejectPaymentRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
