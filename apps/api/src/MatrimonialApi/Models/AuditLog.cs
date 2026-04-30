namespace MatrimonialApi.Models;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AdminId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
