namespace MatrimonialApi.Services;

public class BannedWordFilterService(IConfiguration config)
{
    private readonly IReadOnlyList<string> _words =
        config.GetSection("Chat:BannedWords").Get<string[]>() ?? [];

    public bool ContainsBannedWord(string text)
    {
        if (_words.Count == 0) return false;
        var lower = text.ToLowerInvariant();
        return _words.Any(w => lower.Contains(w.ToLowerInvariant()));
    }
}
