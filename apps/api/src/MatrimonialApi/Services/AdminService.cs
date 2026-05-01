using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Admin;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using MatrimonialApi.Models.Mongo;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace MatrimonialApi.Services;

public class AdminService(AppDbContext pgDb, MongoDbContext mongoDb)
{
    // ── Pending profiles ──────────────────────────────────────────────────────

    public async Task<PendingProfilesResponse> GetPendingProfilesAsync(PendingProfilesRequest req)
    {
        var query = pgDb.ProfileIndexes
            .Where(p => p.Status == ProfileStatus.PendingReview.ToString())
            .OrderBy(p => p.UpdatedAt);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(p => new PendingProfileItem
            {
                Id = p.Id,
                DisplayName = p.DisplayName,
                Gender = p.Gender,
                Religion = p.Religion,
                AgeYears = p.AgeYears,
                CountryOfResidence = p.CountryOfResidence,
                Division = p.Division,
                CompletionPercentage = p.CompletionPercentage,
                SubmittedAt = p.UpdatedAt,
            })
            .ToListAsync();

        return new PendingProfilesResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = req.Page,
            PageSize = req.PageSize,
        };
    }

    // ── Profile detail ────────────────────────────────────────────────────────

    public async Task<AdminProfileDetailResponse> GetProfileDetailAsync(Guid profileId)
    {
        var profile = await mongoDb.Profiles
            .Find(p => p.Id == profileId)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Profile {profileId} not found.");

        var user = await pgDb.Users.FindAsync(profileId)
            ?? throw new KeyNotFoundException($"User {profileId} not found.");

        return new AdminProfileDetailResponse
        {
            Email = user.Email,
            Profile = ToProfileResponse(profile),
        };
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    public async Task<AdminActionResponse> ApproveProfileAsync(Guid adminId, string adminEmail, Guid profileId)
    {
        var profile = await GetMongoProfileOrThrowAsync(profileId);

        if (profile.Status != ProfileStatus.PendingReview)
            throw new InvalidOperationException(
                $"Profile must be in PendingReview to approve. Current status: {profile.Status}.");

        return await ApplyStatusChangeAsync(adminId, adminEmail, profile, ProfileStatus.Active, "ApproveProfile", reason: null);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    public async Task<AdminActionResponse> RejectProfileAsync(
        Guid adminId, string adminEmail, Guid profileId, string reason)
    {
        var profile = await GetMongoProfileOrThrowAsync(profileId);

        if (profile.Status != ProfileStatus.PendingReview)
            throw new InvalidOperationException(
                $"Profile must be in PendingReview to reject. Current status: {profile.Status}.");

        return await ApplyStatusChangeAsync(adminId, adminEmail, profile, ProfileStatus.Draft, "RejectProfile", reason);
    }

    // ── Suspend ───────────────────────────────────────────────────────────────

    public async Task<AdminActionResponse> SuspendProfileAsync(
        Guid adminId, string adminEmail, Guid profileId, string reason)
    {
        var profile = await GetMongoProfileOrThrowAsync(profileId);

        if (profile.Status is ProfileStatus.Deleted or ProfileStatus.Paused)
            throw new InvalidOperationException(
                $"Profile cannot be suspended from status '{profile.Status}'.");

        return await ApplyStatusChangeAsync(adminId, adminEmail, profile, ProfileStatus.Paused, "SuspendProfile", reason);
    }

    // ── Audit logs ────────────────────────────────────────────────────────────

    public async Task<AuditLogListResponse> GetAuditLogsAsync(AuditLogListRequest req)
    {
        var query = pgDb.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(req.Action))
            query = query.Where(l => l.Action == req.Action);

        if (req.AdminId.HasValue)
            query = query.Where(l => l.AdminId == req.AdminId.Value);

        if (req.EntityId.HasValue)
            query = query.Where(l => l.EntityId == req.EntityId.Value);

        query = query.OrderByDescending(l => l.CreatedAt);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(l => new AuditLogItem
            {
                Id = l.Id,
                AdminId = l.AdminId,
                AdminEmail = l.AdminEmail,
                Action = l.Action,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Reason = l.Reason,
                CreatedAt = l.CreatedAt,
            })
            .ToListAsync();

        return new AuditLogListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = req.Page,
            PageSize = req.PageSize,
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<AdminActionResponse> ApplyStatusChangeAsync(
        Guid adminId, string adminEmail, Profile profile, ProfileStatus newStatus, string action, string? reason)
    {
        profile.Status = newStatus;
        profile.UpdatedAt = DateTime.UtcNow;

        // Read/prepare PostgreSQL changes BEFORE writing to MongoDB so a PG miss doesn't leave the stores inconsistent
        var index = await pgDb.ProfileIndexes.FindAsync(profile.Id);
        if (index is null)
        {
            pgDb.ProfileIndexes.Add(BuildIndexFromProfile(profile));
        }
        else
        {
            index.Status = newStatus.ToString();
            index.UpdatedAt = profile.UpdatedAt;
        }

        await mongoDb.Profiles.ReplaceOneAsync(p => p.Id == profile.Id, profile);

        pgDb.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = action,
            EntityType = "Profile",
            EntityId = profile.Id,
            Reason = reason,
            CreatedAt = DateTime.UtcNow,
        });

        await pgDb.SaveChangesAsync();

        return new AdminActionResponse
        {
            ProfileId = profile.Id,
            Action = action,
            NewStatus = newStatus,
        };
    }

    private static ProfileIndex BuildIndexFromProfile(Profile profile)
    {
        static int? Age(DateTime? dob)
        {
            if (dob is null) return null;
            var today = DateTime.UtcNow;
            var age = today.Year - dob.Value.Year;
            if (dob.Value.Date > today.AddYears(-age)) age--;
            return age;
        }

        return new ProfileIndex
        {
            Id = profile.Id,
            DisplayName = profile.Basic?.DisplayName,
            Gender = profile.Basic?.Gender?.ToString(),
            Religion = profile.Basic?.Religion?.ToString(),
            MaritalStatus = profile.Basic?.MaritalStatus?.ToString(),
            CountryOfResidence = profile.Basic?.CountryOfResidence,
            Division = profile.Basic?.Division,
            District = profile.Basic?.District,
            AgeYears = Age(profile.Basic?.DateOfBirth),
            HeightCm = profile.Physical?.HeightCm,
            EducationLevel = profile.Education?.Level?.ToString(),
            EducationLevelOrder = profile.Education?.Level.HasValue == true
                ? (int)profile.Education.Level.Value : (int?)null,
            EmploymentType = profile.Career?.EmploymentType?.ToString(),
            Status = profile.Status.ToString(),
            ProfileVisible = profile.Visibility.ProfileVisible,
            CompletionPercentage = profile.CompletionPercentage,
            LastActiveAt = profile.LastActiveAt,
            UpdatedAt = profile.UpdatedAt,
        };
    }

    private async Task<Profile> GetMongoProfileOrThrowAsync(Guid profileId)
    {
        var profile = await mongoDb.Profiles
            .Find(p => p.Id == profileId)
            .FirstOrDefaultAsync();

        return profile ?? throw new KeyNotFoundException($"Profile {profileId} not found.");
    }

    private static ProfileResponse ToProfileResponse(Profile p)
    {
        static int ComputeAge(DateTime dob)
        {
            var today = DateTime.UtcNow;
            var age = today.Year - dob.Year;
            if (dob.Date > today.AddYears(-age)) age--;
            return age;
        }

        return new ProfileResponse
        {
            Id = p.Id,
            Status = p.Status,
            Visibility = p.Visibility,
            CompletionPercentage = p.CompletionPercentage,
            AgeYears = p.Basic?.DateOfBirth.HasValue == true ? ComputeAge(p.Basic.DateOfBirth.Value) : null,
            Basic = p.Basic,
            Physical = p.Physical,
            Education = p.Education,
            Career = p.Career,
            Family = p.Family,
            Religion = p.Religion,
            Lifestyle = p.Lifestyle,
            PartnerExpectations = p.PartnerExpectations,
            Photos = p.Photos,
            Contact = p.Contact,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            LastActiveAt = p.LastActiveAt,
        };
    }
}
