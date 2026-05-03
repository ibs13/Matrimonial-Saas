namespace MatrimonialApi.DTOs.Chat;

public class ConversationListItem
{
    public Guid ConversationId { get; set; }
    public Guid OtherUserId { get; set; }
    public string OtherDisplayName { get; set; } = string.Empty;
    public string? OtherPhotoUrl { get; set; }
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
    public bool IsBlocked { get; set; }
}
