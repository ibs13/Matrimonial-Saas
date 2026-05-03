namespace MatrimonialApi.DTOs.Admin;

public class MessageReportItem
{
    public Guid ReportId { get; set; }
    public Guid MessageId { get; set; }
    public string MessageBody { get; set; } = string.Empty;
    public Guid ConversationId { get; set; }
    public Guid ReporterId { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsConversationClosed { get; set; }
}
