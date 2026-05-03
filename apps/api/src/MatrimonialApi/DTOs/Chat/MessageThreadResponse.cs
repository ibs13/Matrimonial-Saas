namespace MatrimonialApi.DTOs.Chat;

public class MessageThreadResponse
{
    /// <summary>Null when no messages have been exchanged yet.</summary>
    public Guid? ConversationId { get; set; }
    public Guid OtherUserId { get; set; }
    public string OtherDisplayName { get; set; } = string.Empty;
    public string? OtherPhotoUrl { get; set; }
    /// <summary>Messages ordered oldest → newest (ready for display).</summary>
    public List<MessageResponse> Messages { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool IsBlocked { get; set; }
}
