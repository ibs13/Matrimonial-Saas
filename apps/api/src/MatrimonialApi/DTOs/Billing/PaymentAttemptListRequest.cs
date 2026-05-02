namespace MatrimonialApi.DTOs.Billing;

public class PaymentAttemptListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Status { get; set; }
    public string? Plan { get; set; }
}
