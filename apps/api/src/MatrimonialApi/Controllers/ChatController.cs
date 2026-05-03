using System.Security.Claims;
using MatrimonialApi.DTOs.Chat;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(ChatService chatService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // GET /api/chat/conversations
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var items = await chatService.GetConversationsAsync(CurrentUserId);
        return Ok(items);
    }

    // GET /api/chat/conversations/{userId}?page=1&pageSize=50
    [HttpGet("conversations/{userId:guid}")]
    public async Task<IActionResult> GetThread(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var thread = await chatService.GetThreadAsync(CurrentUserId, userId, page, pageSize);
        return Ok(thread);
    }

    // POST /api/chat/conversations/{userId}/messages
    [HttpPost("conversations/{userId:guid}/messages")]
    public async Task<IActionResult> SendMessage(
        Guid userId,
        [FromBody] SendMessageRequest request)
    {
        var msg = await chatService.SendMessageAsync(CurrentUserId, userId, request);
        return StatusCode(201, msg);
    }

    // PATCH /api/chat/conversations/{userId}/read
    [HttpPatch("conversations/{userId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid userId)
    {
        await chatService.MarkReadAsync(CurrentUserId, userId);
        return NoContent();
    }

    // POST /api/chat/users/{userId}/block
    [HttpPost("users/{userId:guid}/block")]
    public async Task<IActionResult> Block(Guid userId)
    {
        await chatService.BlockUserAsync(CurrentUserId, userId);
        return NoContent();
    }

    // DELETE /api/chat/users/{userId}/block
    [HttpDelete("users/{userId:guid}/block")]
    public async Task<IActionResult> Unblock(Guid userId)
    {
        await chatService.UnblockUserAsync(CurrentUserId, userId);
        return NoContent();
    }

    // GET /api/chat/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await chatService.GetUnreadCountAsync(CurrentUserId);
        return Ok(new { count });
    }
}
