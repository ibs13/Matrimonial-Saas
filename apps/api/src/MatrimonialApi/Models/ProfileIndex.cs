namespace MatrimonialApi.Models;

/// <summary>
/// Denormalized search index row in PostgreSQL.
/// Written on every profile save; read for search/filter queries.
/// Id is the same Guid as User.Id and the MongoDB Profile Id.
/// </summary>
public class ProfileIndex
{
    public Guid Id { get; set; }

    // Core search filters (stored as strings for readability)
    public string? Gender { get; set; }
    public string? Religion { get; set; }
    public string? MaritalStatus { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? Division { get; set; }

    // Range filters
    public int? AgeYears { get; set; }
    public int? HeightCm { get; set; }

    // Qualification filters
    public string? EducationLevel { get; set; }
    public string? EmploymentType { get; set; }

    // Profile meta
    public string Status { get; set; } = "Draft";
    public int CompletionPercentage { get; set; } = 0;
    public DateTime? LastActiveAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
