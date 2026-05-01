namespace MatrimonialApi.DTOs.Report;

public class ReportResponse
{
    public Guid Id { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
