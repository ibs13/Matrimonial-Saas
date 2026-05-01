namespace MatrimonialApi.Models;

public class EmailVerificationToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>SHA-256 hex digest of the raw URL-safe token. Never store the raw value.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    /// <summary>Non-null once the token has been consumed.</summary>
    public DateTime? UsedAt { get; set; }
}
