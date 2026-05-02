using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace MatrimonialApi.Services;

public class ContactUnlockService(AppDbContext pgDb, MongoDbContext mongoDb)
{
    // ── Status check ──────────────────────────────────────────────────────────

    public async Task<ContactStatusResponse> GetStatusAsync(Guid viewerUserId, Guid profileUserId)
    {
        if (viewerUserId == profileUserId)
            return new ContactStatusResponse { BlockReason = "OwnProfile" };

        // Already unlocked — return contact info immediately
        var alreadyUnlocked = await pgDb.ContactUnlocks
            .AnyAsync(u => u.UnlockedByUserId == viewerUserId && u.ProfileUserId == profileUserId);

        if (alreadyUnlocked)
            return await BuildUnlockedResponseAsync(profileUserId);

        // Determine what's blocking the unlock
        var (hasPlan, hasAccepted) = await CheckEligibilityAsync(viewerUserId, profileUserId);

        if (!hasPlan)
            return new ContactStatusResponse { CanUnlock = false, BlockReason = "NoPlan" };

        if (!hasAccepted)
            return new ContactStatusResponse { CanUnlock = false, BlockReason = "NoAcceptedInterest" };

        return new ContactStatusResponse { CanUnlock = true };
    }

    // ── Perform unlock ────────────────────────────────────────────────────────

    public async Task<ContactStatusResponse> UnlockAsync(Guid viewerUserId, Guid profileUserId)
    {
        if (viewerUserId == profileUserId)
            throw new ArgumentException("Cannot unlock your own contact details.");

        // Idempotent: already unlocked → just return the data
        var alreadyUnlocked = await pgDb.ContactUnlocks
            .AnyAsync(u => u.UnlockedByUserId == viewerUserId && u.ProfileUserId == profileUserId);

        if (!alreadyUnlocked)
        {
            var (hasPlan, hasAccepted) = await CheckEligibilityAsync(viewerUserId, profileUserId);

            if (!hasPlan)
                throw new UnauthorizedAccessException(
                    "Contact unlock requires a Premium or VIP membership.");

            if (!hasAccepted)
                throw new InvalidOperationException(
                    "You must have a mutually accepted interest request with this user to unlock their contact details.");

            pgDb.ContactUnlocks.Add(new ContactUnlock
            {
                UnlockedByUserId = viewerUserId,
                ProfileUserId = profileUserId,
            });
            await pgDb.SaveChangesAsync();
        }

        return await BuildUnlockedResponseAsync(profileUserId);
    }

    // ── Admin: full unlock audit log ──────────────────────────────────────────

    public async Task<ContactUnlockAuditResponse> GetAuditLogAsync(int page, int pageSize)
    {
        var baseQuery =
            from cu in pgDb.ContactUnlocks
            join viewer  in pgDb.Users on cu.UnlockedByUserId equals viewer.Id
            join profile in pgDb.Users on cu.ProfileUserId    equals profile.Id
            select new { cu, viewer, profile };

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(x => x.cu.UnlockedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ContactUnlockAuditItem
            {
                Id = x.cu.Id,
                UnlockedByUserId = x.cu.UnlockedByUserId,
                UnlockedByEmail  = x.viewer.Email,
                ProfileUserId    = x.cu.ProfileUserId,
                ProfileUserEmail = x.profile.Email,
                UnlockedAt       = x.cu.UnlockedAt,
            })
            .ToListAsync();

        return new ContactUnlockAuditResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(bool hasPlan, bool hasAccepted)> CheckEligibilityAsync(
        Guid viewerUserId, Guid profileUserId)
    {
        var membership = await pgDb.UserMemberships.FindAsync(viewerUserId);
        var hasPlan = MembershipService.Plans[ResolvePlan(membership)].ContactUnlock;

        var hasAccepted = await pgDb.InterestRequests
            .AnyAsync(r =>
                ((r.SenderId == viewerUserId && r.ReceiverId == profileUserId) ||
                 (r.SenderId == profileUserId && r.ReceiverId == viewerUserId)) &&
                r.Status == InterestRequestStatus.Accepted);

        return (hasPlan, hasAccepted);
    }

    private async Task<ContactStatusResponse> BuildUnlockedResponseAsync(Guid profileUserId)
    {
        var user = await pgDb.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == profileUserId);

        var mongoProfile = await mongoDb.Profiles
            .Find(p => p.Id == profileUserId)
            .FirstOrDefaultAsync();

        return new ContactStatusResponse
        {
            IsUnlocked = true,
            CanUnlock = true,
            Email          = user?.Email,
            Phone          = mongoProfile?.Contact?.Phone,
            GuardianPhone  = mongoProfile?.Contact?.GuardianPhone,
            PresentAddress = mongoProfile?.Contact?.PresentAddress,
            PermanentAddress = mongoProfile?.Contact?.PermanentAddress,
        };
    }

    private static MembershipPlan ResolvePlan(UserMembership? membership)
    {
        if (membership is null) return MembershipPlan.Free;
        if (membership.ExpiresAt.HasValue && membership.ExpiresAt.Value < DateTime.UtcNow)
            return MembershipPlan.Free;
        return membership.Plan;
    }
}
