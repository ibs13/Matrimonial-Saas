using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Search;

public enum SearchSortBy { LastActive, Newest, Completion }

public class SearchProfilesRequest
{
    // ── Core filters ──────────────────────────────────────────────────────────
    public Gender? Gender { get; set; }
    public Religion? Religion { get; set; }

    /// <summary>Accept any of these marital statuses. Empty = no filter.</summary>
    public List<MaritalStatus> MaritalStatuses { get; set; } = [];

    // ── Location filters ──────────────────────────────────────────────────────
    [MaxLength(60)]
    public string? CountryOfResidence { get; set; }

    [MaxLength(60)]
    public string? Division { get; set; }

    [MaxLength(60)]
    public string? District { get; set; }

    // ── Age range ─────────────────────────────────────────────────────────────
    [Range(18, 80)]
    public int? AgeMin { get; set; }

    [Range(18, 80)]
    public int? AgeMax { get; set; }

    // ── Height range (cm) ─────────────────────────────────────────────────────
    [Range(100, 250)]
    public int? HeightMinCm { get; set; }

    [Range(100, 250)]
    public int? HeightMaxCm { get; set; }

    // ── Qualification filters ─────────────────────────────────────────────────

    /// <summary>
    /// Minimum education level — returns profiles at this level or higher.
    /// Uses the integer ordinal of EducationLevel enum.
    /// </summary>
    public EducationLevel? MinEducationLevel { get; set; }

    /// <summary>Accept any of these employment types. Empty = no filter.</summary>
    public List<EmploymentType> EmploymentTypes { get; set; } = [];

    // ── Sorting & pagination ──────────────────────────────────────────────────
    public SearchSortBy SortBy { get; set; } = SearchSortBy.LastActive;

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 50)]
    public int PageSize { get; set; } = 20;
}
