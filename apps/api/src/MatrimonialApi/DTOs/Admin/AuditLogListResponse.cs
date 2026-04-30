namespace MatrimonialApi.DTOs.Admin;

public class AuditLogListResponse
{
    public List<AuditLogItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
