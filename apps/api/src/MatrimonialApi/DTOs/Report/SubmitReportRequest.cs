using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Report;

public class SubmitReportRequest
{
    [Required]
    public ReportReason Reason { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
