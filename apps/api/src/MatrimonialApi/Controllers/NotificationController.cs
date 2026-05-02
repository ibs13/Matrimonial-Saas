using System.Security.Claims;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController(NotificationService notificationService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // GET /api/notifications?page=1&pageSize=20&unreadOnly=false
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool unreadOnly = false)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        var result = await notificationService.GetMyAsync(CurrentUserId, page, pageSize, unreadOnly);
        return Ok(result);
    }

    // GET /api/notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await notificationService.GetUnreadCountAsync(CurrentUserId);
        return Ok(new { count });
    }

    // PATCH /api/notifications/{id}/read
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        await notificationService.MarkAsReadAsync(CurrentUserId, id);
        return NoContent();
    }

    // PATCH /api/notifications/read-all
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await notificationService.MarkAllAsReadAsync(CurrentUserId);
        return NoContent();
    }
}
