namespace MatrimonialApi.Models;

public class ProfileMatch
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CandidateId { get; set; }
    public int Score { get; set; }
    public string MatchLevel { get; set; } = string.Empty;
    /// <summary>JSON-serialised string[] — safe reasons only, no PII.</summary>
    public string MatchReasons { get; set; } = "[]";
    public DateTime ScoredAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
