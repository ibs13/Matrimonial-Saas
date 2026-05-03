namespace MatrimonialApi.Models;

public class MessageReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public Guid ReporterId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Open"; // Open | Dismissed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? ReviewedByAdminId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public Message Message { get; set; } = null!;
    public User Reporter { get; set; } = null!;
}
