namespace MatrimonialApi.DTOs.Admin;

public class PendingProfilesResponse
{
    public List<PendingProfileItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
