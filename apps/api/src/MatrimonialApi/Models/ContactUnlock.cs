namespace MatrimonialApi.Models;

public class ContactUnlock
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Who performed the unlock
    public Guid UnlockedByUserId { get; set; }
    public User UnlockedByUser { get; set; } = null!;

    // Whose contact was unlocked
    public Guid ProfileUserId { get; set; }
    public User ProfileUser { get; set; } = null!;

    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}
