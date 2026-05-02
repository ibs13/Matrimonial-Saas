using System.Security.Claims;
using MatrimonialApi.DTOs.Admin;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AdminService adminService, ReportService reportService) : ControllerBase
{
    private Guid CurrentAdminId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Admin identity not found."));

    private string CurrentAdminEmail =>
        User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? throw new UnauthorizedAccessException("Admin email not found in token.");

    // GET /api/admin/metrics
    [HttpGet("metrics")]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var metrics = await adminService.GetDashboardMetricsAsync();
        return Ok(metrics);
    }

    // GET /api/admin/profiles/pending
    [HttpGet("profiles/pending")]
    public async Task<IActionResult> GetPendingProfiles([FromQuery] PendingProfilesRequest request)
    {
        var response = await adminService.GetPendingProfilesAsync(request);
        return Ok(response);
    }

    // GET /api/admin/profiles/{id}
    [HttpGet("profiles/{id:guid}")]
    public async Task<IActionResult> GetProfileDetail(Guid id)
    {
        var response = await adminService.GetProfileDetailAsync(id);
        return Ok(response);
    }

    // PATCH /api/admin/profiles/{id}/approve
    [HttpPatch("profiles/{id:guid}/approve")]
    public async Task<IActionResult> ApproveProfile(Guid id)
    {
        var response = await adminService.ApproveProfileAsync(CurrentAdminId, CurrentAdminEmail, id);
        return Ok(response);
    }

    // PATCH /api/admin/profiles/{id}/reject
    [HttpPatch("profiles/{id:guid}/reject")]
    public async Task<IActionResult> RejectProfile(Guid id, [FromBody] RejectProfileRequest request)
    {
        var response = await adminService.RejectProfileAsync(CurrentAdminId, CurrentAdminEmail, id, request.Reason);
        return Ok(response);
    }

    // PATCH /api/admin/profiles/{id}/suspend
    [HttpPatch("profiles/{id:guid}/suspend")]
    public async Task<IActionResult> SuspendProfile(Guid id, [FromBody] SuspendProfileRequest request)
    {
        var response = await adminService.SuspendProfileAsync(CurrentAdminId, CurrentAdminEmail, id, request.Reason);
        return Ok(response);
    }

    // GET /api/admin/audit-logs
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogListRequest request)
    {
        var response = await adminService.GetAuditLogsAsync(request);
        return Ok(response);
    }

    // GET /api/admin/reports?status=Active&page=1&pageSize=20
    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var response = await reportService.GetReportsAsync(page, pageSize, status);
        return Ok(response);
    }

    // PATCH /api/admin/reports/{id}/dismiss
    [HttpPatch("reports/{id:guid}/dismiss")]
    public async Task<IActionResult> DismissReport(Guid id)
    {
        await reportService.DismissAsync(CurrentAdminId, CurrentAdminEmail, id);
        return NoContent();
    }

    // PATCH /api/admin/reports/{id}/suspend — dismiss report + suspend the reported profile
    [HttpPatch("reports/{id:guid}/suspend")]
    public async Task<IActionResult> SuspendFromReport(Guid id, [FromBody] SuspendFromReportRequest request)
    {
        var reportedUserId = await reportService.GetReportedUserIdAsync(id);
        var suspendResponse = await adminService.SuspendProfileAsync(
            CurrentAdminId, CurrentAdminEmail, reportedUserId, request.Reason);
        await reportService.DismissAsync(CurrentAdminId, CurrentAdminEmail, id);
        return Ok(suspendResponse);
    }

    // GET /api/admin/photos/pending
    [HttpGet("photos/pending")]
    public async Task<IActionResult> GetPendingPhotos([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var response = await adminService.GetPendingPhotosAsync(page, pageSize);
        return Ok(response);
    }

    // PATCH /api/admin/photos/{userId}/approve
    [HttpPatch("photos/{userId:guid}/approve")]
    public async Task<IActionResult> ApprovePhoto(Guid userId)
    {
        await adminService.ApprovePhotoAsync(CurrentAdminId, CurrentAdminEmail, userId);
        return NoContent();
    }

    // PATCH /api/admin/photos/{userId}/reject
    [HttpPatch("photos/{userId:guid}/reject")]
    public async Task<IActionResult> RejectPhoto(Guid userId, [FromBody] RejectPhotoRequest request)
    {
        await adminService.RejectPhotoAsync(CurrentAdminId, CurrentAdminEmail, userId, request.Reason);
        return NoContent();
    }
}
