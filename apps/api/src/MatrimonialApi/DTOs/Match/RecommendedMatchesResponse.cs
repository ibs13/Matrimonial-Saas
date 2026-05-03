namespace MatrimonialApi.DTOs.Match;

public class RecommendedMatchesResponse
{
    public List<MatchResultItem> Items { get; set; } = [];
    /// <summary>True when the user has set at least one partner preference.</summary>
    public bool HasPreferences { get; set; }
    public DateTime? LastScoredAt { get; set; }
}
