namespace MatrimonialApi.Services;

/// <summary>
/// Deterministic text-based explainer used when no AI API key is configured.
/// Produces consistent, readable explanations from the rule-based match reasons.
/// </summary>
public sealed class FallbackMatchExplainerService : IMatchExplainerService
{
    public Task<string?> ExplainAsync(MatchExplainerInput input)
    {
        var intro = input.Level switch
        {
            "Excellent" => "This is an excellent match",
            "Great"     => "This is a great match",
            "Good"      => "A good compatibility match",
            "Fair"      => "A fair match with some compatible areas",
            _           => "A low compatibility match",
        };

        if (input.Reasons.Count == 0)
            return Task.FromResult<string?>($"{intro}.");

        var fragments = input.Reasons.Select(Normalise).ToList();
        var joined = fragments.Count == 1
            ? fragments[0]
            : string.Join(", ", fragments[..^1]) + " and " + fragments[^1];

        return Task.FromResult<string?>($"{intro}: {joined}.");
    }

    private static string Normalise(string r) => r switch
    {
        "Matches your preferred religion"       => "they share your preferred religion",
        "Age is within your preferred range"    => "their age is within your preferred range",
        "Preferred marital status"              => "their marital status matches your preference",
        "Lives in your preferred location"      => "they live in your preferred location",
        "Meets your education preference"       => "their education meets your preference",
        "Height is within your preferred range" => "their height is within your preferred range",
        _                                       => r.ToLowerInvariant(),
    };
}
