namespace MatrimonialApi.DTOs.Support;

public class TicketListResponse
{
    public List<TicketResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
