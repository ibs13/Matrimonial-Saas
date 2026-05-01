namespace MatrimonialApi.DTOs.Admin;

public class PendingPhotoListResponse
{
    public List<PendingPhotoItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
