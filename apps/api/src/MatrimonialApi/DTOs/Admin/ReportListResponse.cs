namespace MatrimonialApi.DTOs.Admin;

public class ReportListResponse
{
    public List<ReportItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
