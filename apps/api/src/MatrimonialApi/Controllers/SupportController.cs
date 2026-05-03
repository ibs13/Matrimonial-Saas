using System.Security.Claims;
using MatrimonialApi.DTOs.Support;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/support")]
[Authorize]
public class SupportController(SupportService supportService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // POST /api/support
    [HttpPost]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var result = await supportService.CreateTicketAsync(CurrentUserId, request);
        return CreatedAtAction(nameof(GetTicketDetail), new { id = result.Id }, result);
    }

    // GET /api/support?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetMyTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await supportService.GetMyTicketsAsync(CurrentUserId, page, pageSize);
        return Ok(result);
    }

    // GET /api/support/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTicketDetail(Guid id)
    {
        var result = await supportService.GetMyTicketDetailAsync(CurrentUserId, id);
        return Ok(result);
    }

    // POST /api/support/{id}/messages
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> AddMessage(Guid id, [FromBody] AddMessageRequest request)
    {
        var result = await supportService.AddMessageAsync(CurrentUserId, id, request.Body, isStaff: false);
        return Ok(result);
    }
}
