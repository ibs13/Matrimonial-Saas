using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Support;

public class UpdateTicketStatusRequest
{
    [Required]
    public TicketStatus Status { get; set; }
}
