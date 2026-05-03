namespace MatrimonialApi.DTOs.Support;

public class TicketDetailResponse
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<TicketMessageResponse> Messages { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
