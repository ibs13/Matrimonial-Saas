namespace MatrimonialApi.Models;

public class ProfileView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ViewedUserId { get; set; }
    public Guid ViewerUserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    public User ViewedUser { get; set; } = null!;
    public User Viewer { get; set; } = null!;
}
