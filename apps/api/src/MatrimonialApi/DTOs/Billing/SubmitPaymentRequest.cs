using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Billing;

public class SubmitPaymentRequest
{
    [Required, MaxLength(32)]
    public string GatewayName { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string TransactionId { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }
}
