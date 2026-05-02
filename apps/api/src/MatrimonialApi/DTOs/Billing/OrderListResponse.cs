namespace MatrimonialApi.DTOs.Billing;

public class OrderListResponse
{
    public List<OrderResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
