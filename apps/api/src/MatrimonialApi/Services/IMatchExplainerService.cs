namespace MatrimonialApi.Services;

/// <summary>Safe, non-PII fields passed to the AI explainer.</summary>
public record MatchExplainerInput(
    int Score,
    string Level,
    IReadOnlyList<string> Reasons
);

public interface IMatchExplainerService
{
    Task<string?> ExplainAsync(MatchExplainerInput input);
}
