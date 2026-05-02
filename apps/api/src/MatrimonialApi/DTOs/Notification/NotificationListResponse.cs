namespace MatrimonialApi.DTOs.Notification;

public class NotificationListResponse
{
    public List<NotificationResponse> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
