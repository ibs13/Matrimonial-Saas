using System.Security.Claims;
using MatrimonialApi.DTOs.Billing;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrderController(OrderService orderService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // POST /api/orders — create a pending order for a plan upgrade
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
    {
        var response = await orderService.CreateOrderAsync(CurrentUserId, request.Plan);
        return StatusCode(201, response);
    }

    // GET /api/orders/me?page=1&pageSize=20
    [HttpGet("me")]
    public async Task<IActionResult> GetMine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var response = await orderService.GetMyOrdersAsync(CurrentUserId, page, pageSize);
        return Ok(response);
    }

    // POST /api/orders/{orderId}/submit-payment — user submits transaction details for manual verification
    [HttpPost("{orderId:guid}/submit-payment")]
    public async Task<IActionResult> SubmitPayment(Guid orderId, [FromBody] SubmitPaymentRequest request)
    {
        var response = await orderService.SubmitPaymentAsync(CurrentUserId, orderId, request);
        return Ok(response);
    }
}
