namespace MatrimonialApi.DTOs.Admin;

public class ReportItem
{
    public Guid Id { get; set; }
    public Guid ReportedUserId { get; set; }
    public string ReportedDisplayName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
