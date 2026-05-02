using System.Security.Claims;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatrimonialApi.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController(ProfileService profileService, ProfileViewService profileViewService) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found."));

    // POST /api/profile — initialize an empty profile for the authenticated user
    [HttpPost]
    public async Task<IActionResult> Create()
    {
        var response = await profileService.CreateAsync(CurrentUserId);
        return CreatedAtAction(nameof(GetMyProfile), response);
    }

    // GET /api/profile/me — full profile (owner sees everything)
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var response = await profileService.GetMyProfileAsync(CurrentUserId);
        return Ok(response);
    }

    // PATCH /api/profile/basic
    [HttpPatch("basic")]
    public async Task<IActionResult> UpdateBasic([FromBody] UpdateBasicInfoRequest request)
    {
        var response = await profileService.UpdateBasicAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/physical
    [HttpPatch("physical")]
    public async Task<IActionResult> UpdatePhysical([FromBody] UpdatePhysicalInfoRequest request)
    {
        var response = await profileService.UpdatePhysicalAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/education
    [HttpPatch("education")]
    public async Task<IActionResult> UpdateEducation([FromBody] UpdateEducationInfoRequest request)
    {
        var response = await profileService.UpdateEducationAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/career
    [HttpPatch("career")]
    public async Task<IActionResult> UpdateCareer([FromBody] UpdateCareerInfoRequest request)
    {
        var response = await profileService.UpdateCareerAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/family
    [HttpPatch("family")]
    public async Task<IActionResult> UpdateFamily([FromBody] UpdateFamilyInfoRequest request)
    {
        var response = await profileService.UpdateFamilyAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/religion
    [HttpPatch("religion")]
    public async Task<IActionResult> UpdateReligion([FromBody] UpdateReligionInfoRequest request)
    {
        var response = await profileService.UpdateReligionAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/lifestyle
    [HttpPatch("lifestyle")]
    public async Task<IActionResult> UpdateLifestyle([FromBody] UpdateLifestyleInfoRequest request)
    {
        var response = await profileService.UpdateLifestyleAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/partner-expectations
    [HttpPatch("partner-expectations")]
    public async Task<IActionResult> UpdatePartnerExpectations([FromBody] UpdatePartnerExpectationsRequest request)
    {
        var response = await profileService.UpdatePartnerExpectationsAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/contact
    [HttpPatch("contact")]
    public async Task<IActionResult> UpdateContact([FromBody] UpdateContactInfoRequest request)
    {
        var response = await profileService.UpdateContactAsync(CurrentUserId, request);
        return Ok(response);
    }

    // PATCH /api/profile/visibility
    [HttpPatch("visibility")]
    public async Task<IActionResult> UpdateVisibility([FromBody] UpdateVisibilityRequest request)
    {
        var response = await profileService.UpdateVisibilityAsync(CurrentUserId, request);
        return Ok(response);
    }

    // POST /api/profile/submit — send profile to admin review queue
    [HttpPost("submit")]
    public async Task<IActionResult> Submit()
    {
        var response = await profileService.SubmitForReviewAsync(CurrentUserId);
        return Ok(response);
    }

    // POST /api/profile/photo — upload profile photo (multipart/form-data)
    [HttpPost("photo")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhoto(IFormFile file, CancellationToken ct)
    {
        var response = await profileService.UploadPhotoAsync(CurrentUserId, file, ct);
        return Ok(response);
    }

    // PATCH /api/profile/photo/visibility — change photo visibility
    [HttpPatch("photo/visibility")]
    public async Task<IActionResult> UpdatePhotoVisibility([FromBody] UpdatePhotoVisibilityRequest request)
    {
        var response = await profileService.UpdatePhotoVisibilityAsync(CurrentUserId, request.Visibility);
        return Ok(response);
    }

    // DELETE /api/profile/photo — remove profile photo
    [HttpDelete("photo")]
    public async Task<IActionResult> DeletePhoto(CancellationToken ct)
    {
        await profileService.DeletePhotoAsync(CurrentUserId, ct);
        return NoContent();
    }

    // GET /api/profile/{userId}/photo — get photo URL for viewer (respects visibility rules)
    [HttpGet("{userId:guid}/photo")]
    public async Task<IActionResult> GetPhoto(Guid userId)
    {
        var url = await profileService.GetPhotoUrlForViewerAsync(CurrentUserId, userId);
        return Ok(new { photoUrl = url });
    }

    // POST /api/profile/{id}/view — record a profile view (deduped per UTC day)
    [HttpPost("{id:guid}/view")]
    public async Task<IActionResult> RecordView(Guid id)
    {
        await profileViewService.RecordAsync(CurrentUserId, id);
        return NoContent();
    }

    // GET /api/profile/viewers — who viewed my profile
    [HttpGet("viewers")]
    public async Task<IActionResult> GetViewers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        var result = await profileViewService.GetViewersAsync(CurrentUserId, page, pageSize);
        return Ok(result);
    }
}
