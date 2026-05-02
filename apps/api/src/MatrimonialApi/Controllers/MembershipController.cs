using System.Security.Claims;
using MatrimonialApi.DTOs.Membership;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/membership")]
public class MembershipController(MembershipService membershipService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    /// <summary>All plan definitions — used by the public pricing page.</summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public IActionResult GetPlans() => Ok(MembershipService.AllPlans);

    /// <summary>The authenticated user's current membership and monthly usage.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyMembership()
    {
        var response = await membershipService.GetMyMembershipAsync(CurrentUserId);
        return Ok(response);
    }
}
