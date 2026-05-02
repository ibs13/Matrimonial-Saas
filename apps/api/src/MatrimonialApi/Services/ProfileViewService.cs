using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class ProfileViewService(AppDbContext db)
{
    // ── Record ────────────────────────────────────────────────────────────────

    /// Records one view per viewer/profile per UTC day.
    /// Silently no-ops for self-views or non-active/invisible profiles.
    public async Task RecordAsync(Guid viewerUserId, Guid viewedUserId)
    {
        if (viewerUserId == viewedUserId) return;

        var isViewable = await db.ProfileIndexes.AnyAsync(p =>
            p.Id == viewedUserId &&
            p.Status == "Active" &&
            p.ProfileVisible);

        if (!isViewable) return;

        var todayUtc = DateTime.UtcNow.Date;

        var alreadyViewed = await db.ProfileViews.AnyAsync(v =>
            v.ViewerUserId == viewerUserId &&
            v.ViewedUserId == viewedUserId &&
            v.ViewedAt >= todayUtc);

        if (alreadyViewed) return;

        db.ProfileViews.Add(new ProfileView
        {
            ViewerUserId = viewerUserId,
            ViewedUserId = viewedUserId,
        });

        await db.SaveChangesAsync();
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// Returns who viewed this user's profile, most recent first.
    /// Viewers with suspended, deleted, or private profiles are excluded.
    public async Task<ProfileViewersResponse> GetViewersAsync(Guid userId, int page, int pageSize)
    {
        // Aggregate per viewer, filtering out non-active / private profiles at the JOIN.
        // Step 1: group in DB to get one row per viewer with their latest view time.
        var viewerAgg =
            from v in db.ProfileViews
            where v.ViewedUserId == userId
            join p in db.ProfileIndexes on v.ViewerUserId equals p.Id
            where p.Status == "Active" && p.ProfileVisible
            group v by v.ViewerUserId into g
            select new
            {
                ViewerUserId = g.Key,
                ViewedAt = g.Max(v => v.ViewedAt),
            };

        var totalCount = await viewerAgg.CountAsync();

        // Step 2: paginate the aggregated viewer list.
        var page_ = await viewerAgg
            .OrderByDescending(x => x.ViewedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Step 3: fetch profile index rows for the page's viewers.
        var ids = page_.ConvertAll(x => x.ViewerUserId);

        var profiles = await db.ProfileIndexes
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var items = page_
            .Where(x => profiles.ContainsKey(x.ViewerUserId))
            .Select(x =>
            {
                var p = profiles[x.ViewerUserId];
                return new ProfileViewerItem
                {
                    ViewerUserId = x.ViewerUserId,
                    DisplayName = p.DisplayName ?? string.Empty,
                    Gender = p.Gender,
                    AgeYears = p.AgeYears,
                    CountryOfResidence = p.CountryOfResidence,
                    Division = p.Division,
                    PhotoUrl = p.PhotoUrl,
                    ViewedAt = x.ViewedAt,
                };
            })
            .ToList();

        return new ProfileViewersResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }
}
