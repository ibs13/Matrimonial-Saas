using System.Security.Claims;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/admin/chat")]
[Authorize(Policy = "AdminOnly")]
public class AdminChatController(ChatModerationService chatModeration) : ControllerBase
{
    private Guid CurrentAdminId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Admin identity not found."));

    private string CurrentAdminEmail =>
        User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? throw new UnauthorizedAccessException("Admin email not found in token.");

    // GET /api/admin/chat/reports?status=Open&page=1&pageSize=20
    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var response = await chatModeration.GetReportsAsync(page, pageSize, status);
        return Ok(response);
    }

    // PATCH /api/admin/chat/reports/{id}/dismiss
    [HttpPatch("reports/{id:guid}/dismiss")]
    public async Task<IActionResult> DismissReport(Guid id)
    {
        await chatModeration.DismissReportAsync(CurrentAdminId, CurrentAdminEmail, id);
        return NoContent();
    }

    // POST /api/admin/chat/conversations/{convId}/close
    [HttpPost("conversations/{convId:guid}/close")]
    public async Task<IActionResult> CloseConversation(Guid convId)
    {
        await chatModeration.CloseConversationAsync(CurrentAdminId, CurrentAdminEmail, convId);
        return NoContent();
    }
}
