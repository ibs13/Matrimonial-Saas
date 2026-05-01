namespace MatrimonialApi.Models;

public class SavedProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid SavedUserId { get; set; }
    public User SavedUser { get; set; } = null!;

    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
}
