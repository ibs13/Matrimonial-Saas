namespace MatrimonialApi.DTOs.Chat;

public class MessageResponse
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    /// <summary>True when the non-sender has a MessageRead record for this message.</summary>
    public bool IsRead { get; set; }
    /// <summary>True when the current user has already reported this message.</summary>
    public bool IsReported { get; set; }
}
