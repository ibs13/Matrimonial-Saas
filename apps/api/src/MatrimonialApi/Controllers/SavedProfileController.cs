using System.Security.Claims;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/saved")]
[Authorize]
public class SavedProfileController(SavedProfileService savedProfileService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // GET /api/saved
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await savedProfileService.GetAllAsync(CurrentUserId);
        return Ok(items);
    }

    // POST /api/saved/{userId}
    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Save(Guid userId)
    {
        var response = await savedProfileService.SaveAsync(CurrentUserId, userId);
        return StatusCode(201, response);
    }

    // DELETE /api/saved/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id)
    {
        await savedProfileService.RemoveAsync(CurrentUserId, id);
        return NoContent();
    }
}
