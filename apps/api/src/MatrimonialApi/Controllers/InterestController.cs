using System.Security.Claims;
using MatrimonialApi.DTOs.Interest;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/interests")]
[Authorize]
public class InterestController(InterestService interestService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // POST /api/interests
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendInterestRequest request)
    {
        var response = await interestService.SendAsync(CurrentUserId, request);
        return StatusCode(201, response);
    }

    // GET /api/interests/sent?status=Pending&page=1&pageSize=20
    [HttpGet("sent")]
    public async Task<IActionResult> GetSent([FromQuery] InterestListRequest request)
    {
        var response = await interestService.GetSentAsync(CurrentUserId, request);
        return Ok(response);
    }

    // GET /api/interests/received?status=Pending&page=1&pageSize=20
    [HttpGet("received")]
    public async Task<IActionResult> GetReceived([FromQuery] InterestListRequest request)
    {
        var response = await interestService.GetReceivedAsync(CurrentUserId, request);
        return Ok(response);
    }

    // DELETE /api/interests/{id} — sender withdraws a Pending request
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        await interestService.CancelAsync(CurrentUserId, id);
        return NoContent();
    }

    // PATCH /api/interests/{id}/accept — receiver accepts
    [HttpPatch("{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id)
    {
        var response = await interestService.AcceptAsync(CurrentUserId, id);
        return Ok(response);
    }

    // PATCH /api/interests/{id}/reject — receiver rejects
    [HttpPatch("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var response = await interestService.RejectAsync(CurrentUserId, id);
        return Ok(response);
    }
}
