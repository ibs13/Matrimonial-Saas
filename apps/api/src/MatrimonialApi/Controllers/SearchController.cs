using System.Security.Claims;
using MatrimonialApi.DTOs.Search;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController(SearchService searchService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    /// <summary>
    /// Search active profiles using PostgreSQL index.
    /// All filters are optional; omit to return all active profiles.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Search([FromBody] SearchProfilesRequest request)
    {
        var result = await searchService.SearchAsync(CurrentUserId, request);
        return Ok(result);
    }
}
