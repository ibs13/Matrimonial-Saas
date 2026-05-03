namespace MatrimonialApi.Models;

public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The participant with the lower GUID — always User1Id &lt; User2Id.</summary>
    public Guid User1Id { get; set; }
    public Guid User2Id { get; set; }

    public DateTime? LastMessageAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }

    public User User1 { get; set; } = null!;
    public User User2 { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = [];
}
