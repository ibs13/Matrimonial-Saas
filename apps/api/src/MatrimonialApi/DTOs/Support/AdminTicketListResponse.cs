namespace MatrimonialApi.DTOs.Support;

public class AdminTicketListResponse
{
    public List<AdminTicketItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
