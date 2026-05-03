using System.Security.Claims;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/matches")]
[Authorize(Policy = "UserOrAdmin")]
public class MatchesController(MatchScoringService matchService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    /// <summary>
    /// Returns top-20 recommended matches for the current user.
    /// Scores are cached for 24 hours. Pass ?refresh=true to force re-scoring.
    /// </summary>
    [HttpGet("recommended")]
    public async Task<IActionResult> GetRecommended([FromQuery] bool refresh = false)
    {
        var result = await matchService.GetRecommendedAsync(CurrentUserId, refresh);
        return Ok(result);
    }
}
