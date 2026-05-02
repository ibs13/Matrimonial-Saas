using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Interest;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class InterestService(AppDbContext pgDb, MembershipService membershipService)
{
    // ── Send ──────────────────────────────────────────────────────────────────

    public async Task<InterestRequestResponse> SendAsync(Guid senderId, SendInterestRequest req)
    {
        if (senderId == req.ReceiverId)
            throw new ArgumentException("You cannot send an interest request to yourself.");

        var withinLimit = await membershipService.CanSendInterestThisMonthAsync(senderId);
        if (!withinLimit)
            throw new InvalidOperationException(
                "You have reached your monthly interest limit. Upgrade your plan to send more.");

        // Receiver must have an active profile
        var receiverExists = await pgDb.ProfileIndexes
            .AnyAsync(p => p.Id == req.ReceiverId && p.Status == "Active");

        if (!receiverExists)
            throw new KeyNotFoundException("The recipient does not have an active profile.");

        // Duplicate check — both directions, only Pending or Accepted block a new request
        var blocker = await pgDb.InterestRequests
            .Where(r =>
                (r.SenderId == senderId && r.ReceiverId == req.ReceiverId) ||
                (r.SenderId == req.ReceiverId && r.ReceiverId == senderId))
            .Where(r => r.Status == InterestRequestStatus.Pending ||
                        r.Status == InterestRequestStatus.Accepted)
            .FirstOrDefaultAsync();

        if (blocker is not null)
        {
            var reason = blocker.Status == InterestRequestStatus.Accepted
                ? "You are already connected with this user."
                : blocker.SenderId == senderId
                    ? "You already have a pending interest request to this user."
                    : "This user has already sent you an interest request — check your received requests.";

            throw new InvalidOperationException(reason);
        }

        var request = new InterestRequest
        {
            SenderId = senderId,
            ReceiverId = req.ReceiverId,
            Message = req.Message,
        };

        pgDb.InterestRequests.Add(request);
        await pgDb.SaveChangesAsync();

        var senderName = (await pgDb.ProfileIndexes.FindAsync(senderId))?.DisplayName ?? "Someone";
        pgDb.Notifications.Add(new Notification
        {
            UserId = req.ReceiverId,
            Type = NotificationType.InterestReceived,
            Title = "New interest received",
            Body = $"{senderName} sent you an interest request.",
        });
        await pgDb.SaveChangesAsync();

        return await BuildResponseAsync(request, perspectiveOf: senderId);
    }

    // ── Cancel (sender withdraws a Pending request) ───────────────────────────

    public async Task CancelAsync(Guid senderId, Guid requestId)
    {
        var request = await pgDb.InterestRequests.FindAsync(requestId)
            ?? throw new KeyNotFoundException("Interest request not found.");

        if (request.SenderId != senderId)
            throw new UnauthorizedAccessException("You can only cancel your own sent requests.");

        if (request.Status != InterestRequestStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot cancel a request with status '{request.Status}'. Only Pending requests can be cancelled.");

        request.Status = InterestRequestStatus.Cancelled;
        await pgDb.SaveChangesAsync();
    }

    // ── Accept ────────────────────────────────────────────────────────────────

    public async Task<InterestRequestResponse> AcceptAsync(Guid receiverId, Guid requestId)
    {
        var request = await pgDb.InterestRequests.FindAsync(requestId)
            ?? throw new KeyNotFoundException("Interest request not found.");

        if (request.ReceiverId != receiverId)
            throw new UnauthorizedAccessException("You can only accept requests sent to you.");

        if (request.Status != InterestRequestStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot accept a request with status '{request.Status}'. Only Pending requests can be accepted.");

        request.Status = InterestRequestStatus.Accepted;
        request.RespondedAt = DateTime.UtcNow;
        await pgDb.SaveChangesAsync();

        var acceptorName = (await pgDb.ProfileIndexes.FindAsync(receiverId))?.DisplayName ?? "Someone";
        pgDb.Notifications.Add(new Notification
        {
            UserId = request.SenderId,
            Type = NotificationType.InterestAccepted,
            Title = "Interest accepted",
            Body = $"{acceptorName} accepted your interest request.",
        });
        await pgDb.SaveChangesAsync();

        return await BuildResponseAsync(request, perspectiveOf: receiverId);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    public async Task<InterestRequestResponse> RejectAsync(Guid receiverId, Guid requestId)
    {
        var request = await pgDb.InterestRequests.FindAsync(requestId)
            ?? throw new KeyNotFoundException("Interest request not found.");

        if (request.ReceiverId != receiverId)
            throw new UnauthorizedAccessException("You can only reject requests sent to you.");

        if (request.Status != InterestRequestStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot reject a request with status '{request.Status}'. Only Pending requests can be rejected.");

        request.Status = InterestRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;
        await pgDb.SaveChangesAsync();

        var rejectorName = (await pgDb.ProfileIndexes.FindAsync(receiverId))?.DisplayName ?? "Someone";
        pgDb.Notifications.Add(new Notification
        {
            UserId = request.SenderId,
            Type = NotificationType.InterestRejected,
            Title = "Interest declined",
            Body = $"{rejectorName} declined your interest request.",
        });
        await pgDb.SaveChangesAsync();

        return await BuildResponseAsync(request, perspectiveOf: receiverId);
    }

    // ── Lists ─────────────────────────────────────────────────────────────────

    public async Task<InterestListResponse> GetSentAsync(Guid senderId, InterestListRequest req)
    {
        var baseQuery = pgDb.InterestRequests
            .Where(r => r.SenderId == senderId);

        if (req.Status.HasValue)
            baseQuery = baseQuery.Where(r => r.Status == req.Status.Value);

        var totalCount = await baseQuery.CountAsync();

        // LEFT JOIN with ProfileIndexes to get receiver's display info.
        // DefaultIfEmpty() makes it a LEFT JOIN — the request still shows if receiver
        // hasn't set up a profile index yet.
        var items = await (
            from r in baseQuery
            join p in pgDb.ProfileIndexes on r.ReceiverId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            orderby r.SentAt descending
            select new InterestRequestResponse
            {
                Id = r.Id,
                SenderId = r.SenderId,
                ReceiverId = r.ReceiverId,
                OtherUserId = r.ReceiverId,
                OtherDisplayName = p != null ? p.DisplayName ?? string.Empty : string.Empty,
                OtherGender = p != null ? p.Gender : null,
                OtherAgeYears = p != null ? p.AgeYears : null,
                OtherCountryOfResidence = p != null ? p.CountryOfResidence : null,
                OtherDivision = p != null ? p.Division : null,
                Status = r.Status.ToString(),
                Message = r.Message,
                SentAt = r.SentAt,
                RespondedAt = r.RespondedAt,
            }
        )
        .Skip((req.Page - 1) * req.PageSize)
        .Take(req.PageSize)
        .ToListAsync();

        return new InterestListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = req.Page,
            PageSize = req.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)req.PageSize),
        };
    }

    public async Task<InterestListResponse> GetReceivedAsync(Guid receiverId, InterestListRequest req)
    {
        var baseQuery = pgDb.InterestRequests
            .Where(r => r.ReceiverId == receiverId);

        if (req.Status.HasValue)
            baseQuery = baseQuery.Where(r => r.Status == req.Status.Value);

        var totalCount = await baseQuery.CountAsync();

        var items = await (
            from r in baseQuery
            join p in pgDb.ProfileIndexes on r.SenderId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            orderby r.SentAt descending
            select new InterestRequestResponse
            {
                Id = r.Id,
                SenderId = r.SenderId,
                ReceiverId = r.ReceiverId,
                OtherUserId = r.SenderId,
                OtherDisplayName = p != null ? p.DisplayName ?? string.Empty : string.Empty,
                OtherGender = p != null ? p.Gender : null,
                OtherAgeYears = p != null ? p.AgeYears : null,
                OtherCountryOfResidence = p != null ? p.CountryOfResidence : null,
                OtherDivision = p != null ? p.Division : null,
                Status = r.Status.ToString(),
                Message = r.Message,
                SentAt = r.SentAt,
                RespondedAt = r.RespondedAt,
            }
        )
        .Skip((req.Page - 1) * req.PageSize)
        .Take(req.PageSize)
        .ToListAsync();

        return new InterestListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = req.Page,
            PageSize = req.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)req.PageSize),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<InterestRequestResponse> BuildResponseAsync(
        InterestRequest request, Guid perspectiveOf)
    {
        var otherUserId = perspectiveOf == request.SenderId
            ? request.ReceiverId
            : request.SenderId;

        var otherProfile = await pgDb.ProfileIndexes
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == otherUserId);

        return new InterestRequestResponse
        {
            Id = request.Id,
            SenderId = request.SenderId,
            ReceiverId = request.ReceiverId,
            OtherUserId = otherUserId,
            OtherDisplayName = otherProfile?.DisplayName ?? string.Empty,
            OtherGender = otherProfile?.Gender,
            OtherAgeYears = otherProfile?.AgeYears,
            OtherCountryOfResidence = otherProfile?.CountryOfResidence,
            OtherDivision = otherProfile?.Division,
            Status = request.Status.ToString(),
            Message = request.Message,
            SentAt = request.SentAt,
            RespondedAt = request.RespondedAt,
        };
    }
}
