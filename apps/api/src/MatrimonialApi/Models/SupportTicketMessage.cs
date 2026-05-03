namespace MatrimonialApi.Models;

public class SupportTicketMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TicketId { get; set; }
    public Guid AuthorId { get; set; }

    /// <summary>True when the message was written by a staff/admin member.</summary>
    public bool IsStaff { get; set; } = false;

    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SupportTicket Ticket { get; set; } = null!;
}
