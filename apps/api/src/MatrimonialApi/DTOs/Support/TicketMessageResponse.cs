namespace MatrimonialApi.DTOs.Support;

public class TicketMessageResponse
{
    public Guid Id { get; set; }
    public bool IsStaff { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
