namespace MatrimonialApi.DTOs.Interest;

public class InterestListResponse
{
    public List<InterestRequestResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
