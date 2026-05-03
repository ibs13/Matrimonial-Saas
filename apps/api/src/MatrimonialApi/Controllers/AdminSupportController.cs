using System.Security.Claims;
using MatrimonialApi.DTOs.Support;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/admin/support")]
[Authorize(Policy = "AdminOnly")]
public class AdminSupportController(SupportService supportService) : ControllerBase
{
    private Guid CurrentAdminId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Admin identity not found."));

    // GET /api/admin/support?page=1&pageSize=20&status=Open&category=Payment
    [HttpGet]
    public async Task<IActionResult> GetAllTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? category = null)
    {
        var result = await supportService.GetAllTicketsAsync(page, pageSize, status, category);
        return Ok(result);
    }

    // GET /api/admin/support/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTicketDetail(Guid id)
    {
        var result = await supportService.GetTicketDetailForAdminAsync(id);
        return Ok(result);
    }

    // POST /api/admin/support/{id}/messages
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> AddMessage(Guid id, [FromBody] AddMessageRequest request)
    {
        var result = await supportService.AddMessageAsync(CurrentAdminId, id, request.Body, isStaff: true);
        return Ok(result);
    }

    // PATCH /api/admin/support/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTicketStatusRequest request)
    {
        var result = await supportService.UpdateStatusAsync(id, request.Status);
        return Ok(result);
    }
}
