using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Billing;

public class CreateOrderRequest
{
    [Required]
    public string Plan { get; set; } = string.Empty;
}
