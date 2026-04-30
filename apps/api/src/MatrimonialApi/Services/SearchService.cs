using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Search;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class SearchService(AppDbContext pgDb)
{
    public async Task<SearchResponse> SearchAsync(Guid currentUserId, SearchProfilesRequest request)
    {
        ValidateRanges(request);

        // ── Base query — only Active, visible profiles; never the caller's own ──
        var query = pgDb.ProfileIndexes
            .Where(p => p.Status == "Active"
                     && p.ProfileVisible
                     && p.Id != currentUserId)
            .AsNoTracking();

        // ── Apply filters ─────────────────────────────────────────────────────
        if (request.Gender.HasValue)
            query = query.Where(p => p.Gender == request.Gender.Value.ToString());

        if (request.Religion.HasValue)
            query = query.Where(p => p.Religion == request.Religion.Value.ToString());

        if (request.MaritalStatuses.Count > 0)
        {
            var values = request.MaritalStatuses.Select(ms => ms.ToString()).ToList();
            query = query.Where(p => values.Contains(p.MaritalStatus!));
        }

        if (!string.IsNullOrWhiteSpace(request.CountryOfResidence))
            query = query.Where(p => p.CountryOfResidence == request.CountryOfResidence);

        if (!string.IsNullOrWhiteSpace(request.Division))
            query = query.Where(p => p.Division == request.Division);

        if (!string.IsNullOrWhiteSpace(request.District))
            query = query.Where(p => p.District == request.District);

        if (request.AgeMin.HasValue)
            query = query.Where(p => p.AgeYears >= request.AgeMin);

        if (request.AgeMax.HasValue)
            query = query.Where(p => p.AgeYears <= request.AgeMax);

        if (request.HeightMinCm.HasValue)
            query = query.Where(p => p.HeightCm >= request.HeightMinCm);

        if (request.HeightMaxCm.HasValue)
            query = query.Where(p => p.HeightCm <= request.HeightMaxCm);

        if (request.MinEducationLevel.HasValue)
            query = query.Where(p => p.EducationLevelOrder >= (int)request.MinEducationLevel.Value);

        if (request.EmploymentTypes.Count > 0)
        {
            var values = request.EmploymentTypes.Select(et => et.ToString()).ToList();
            query = query.Where(p => values.Contains(p.EmploymentType!));
        }

        // ── Count before pagination (single round-trip via split query) ───────
        var totalCount = await query.CountAsync();

        // ── Sort ──────────────────────────────────────────────────────────────
        query = request.SortBy switch
        {
            SearchSortBy.Newest => query.OrderByDescending(p => p.UpdatedAt),
            SearchSortBy.Completion => query.OrderByDescending(p => p.CompletionPercentage),
            // LastActive: nulls last (profiles that have never been active go to the end)
            _ => query.OrderByDescending(p => p.LastActiveAt.HasValue)
                      .ThenByDescending(p => p.LastActiveAt),
        };

        // ── Paginate & project ────────────────────────────────────────────────
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new SearchResultItem
            {
                UserId = p.Id,
                DisplayName = p.DisplayName ?? string.Empty,
                Gender = p.Gender,
                AgeYears = p.AgeYears,
                Religion = p.Religion,
                MaritalStatus = p.MaritalStatus,
                CountryOfResidence = p.CountryOfResidence,
                Division = p.Division,
                District = p.District,
                EducationLevel = p.EducationLevel,
                EmploymentType = p.EmploymentType,
                HeightCm = p.HeightCm,
                CompletionPercentage = p.CompletionPercentage,
                LastActiveAt = p.LastActiveAt,
            })
            .ToListAsync();

        return new SearchResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize),
        };
    }

    private static void ValidateRanges(SearchProfilesRequest request)
    {
        if (request.AgeMin.HasValue && request.AgeMax.HasValue && request.AgeMin > request.AgeMax)
            throw new ArgumentException("AgeMin cannot be greater than AgeMax.");

        if (request.HeightMinCm.HasValue && request.HeightMaxCm.HasValue && request.HeightMinCm > request.HeightMaxCm)
            throw new ArgumentException("HeightMinCm cannot be greater than HeightMaxCm.");
    }
}
