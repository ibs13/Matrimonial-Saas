namespace MatrimonialApi.DTOs.Search;

public class SearchResponse
{
    public List<SearchResultItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
