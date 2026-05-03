using System.Net.Http.Json;
using System.Text.Json;

namespace MatrimonialApi.Services;

/// <summary>
/// Calls the Anthropic Messages API to generate a short compatibility explanation.
/// Only the match score, level, and pre-computed safe reasons are sent — no PII.
/// The prompt is never stored; only the returned explanation text is persisted.
/// Falls back to null on any error so the caller can degrade gracefully.
/// </summary>
public sealed class AnthropicMatchExplainerService(
    IHttpClientFactory httpClientFactory,
    ILogger<AnthropicMatchExplainerService> logger,
    string apiKey) : IMatchExplainerService
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string Model = "claude-haiku-4-5-20251001";

    public async Task<string?> ExplainAsync(MatchExplainerInput input)
    {
        try
        {
            var body = new
            {
                model = Model,
                max_tokens = 150,
                messages = new[]
                {
                    new { role = "user", content = BuildPrompt(input) }
                }
            };

            var http = httpClientFactory.CreateClient("anthropic");
            var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl)
            {
                Content = JsonContent.Create(body),
            };
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");

            var response = await http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Anthropic API returned {Status} for match explanation",
                    (int)response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString()
                ?.Trim();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI explanation generation failed for score {Score}", input.Score);
            return null;
        }
    }

    // Prompt contains only score, level, and rule-derived reasons — no names, addresses, or PII.
    private static string BuildPrompt(MatchExplainerInput input)
    {
        var reasonsText = input.Reasons.Count > 0
            ? string.Join("; ", input.Reasons)
            : "no specific criteria highlighted";

        return
            $"A matrimonial profile scored {input.Score}/100 ({input.Level}) " +
            $"against the user's partner preferences. " +
            $"Compatibility criteria met: {reasonsText}. " +
            "Write a warm, encouraging 1–2 sentence explanation of why this profile may be a good match. " +
            "Be honest but positive. Do not reference any names, contact details, or private information.";
    }
}
