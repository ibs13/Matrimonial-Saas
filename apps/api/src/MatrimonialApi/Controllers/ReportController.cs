using System.Security.Claims;
using MatrimonialApi.DTOs.Report;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportController(ReportService reportService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // POST /api/reports/{profileUserId}
    [HttpPost("{profileUserId:guid}")]
    public async Task<IActionResult> Submit(Guid profileUserId, [FromBody] SubmitReportRequest request)
    {
        var response = await reportService.SubmitAsync(CurrentUserId, profileUserId, request);
        return StatusCode(201, response);
    }
}
