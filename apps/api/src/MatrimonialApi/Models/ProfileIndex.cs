namespace MatrimonialApi.Models;

/// <summary>
/// Denormalized search index row in PostgreSQL.
/// Written on every profile save; read for all search/filter queries.
/// Id equals User.Id and the MongoDB Profile Id — no separate FK needed.
/// </summary>
public class ProfileIndex
{
    public Guid Id { get; set; }

    // ── Display ───────────────────────────────────────────────────────────────
    /// <summary>Public display name — safe to return in search results.</summary>
    public string? DisplayName { get; set; }

    // ── Core search filters ───────────────────────────────────────────────────
    public string? Gender { get; set; }
    public string? Religion { get; set; }
    public string? MaritalStatus { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }
    public string? District { get; set; }

    // ── Range filters ─────────────────────────────────────────────────────────
    public int? AgeYears { get; set; }
    public int? HeightCm { get; set; }

    // ── Qualification filters ─────────────────────────────────────────────────
    public string? EducationLevel { get; set; }

    /// <summary>
    /// Integer ordinal of EducationLevel enum (BelowSSC=0 … PostDoc=7).
    /// Enables range queries: EducationLevelOrder >= minLevel.
    /// </summary>
    public int? EducationLevelOrder { get; set; }

    public string? EmploymentType { get; set; }

    // ── Visibility & status ───────────────────────────────────────────────────
    public string Status { get; set; } = "Draft";

    /// <summary>Mirrors Profile.Visibility.ProfileVisible — filtered at Postgres level.</summary>
    public bool ProfileVisible { get; set; } = true;

    // ── Photo (denormalized — only Approved + Public photos are stored here) ─────
    /// <summary>Null unless the profile has an approved, publicly-visible photo.</summary>
    public string? PhotoUrl { get; set; }

    // ── Meta ──────────────────────────────────────────────────────────────────
    public int CompletionPercentage { get; set; } = 0;
    public DateTime? LastActiveAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
