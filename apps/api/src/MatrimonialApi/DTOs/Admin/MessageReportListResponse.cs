namespace MatrimonialApi.DTOs.Admin;

public class MessageReportListResponse
{
    public List<MessageReportItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
