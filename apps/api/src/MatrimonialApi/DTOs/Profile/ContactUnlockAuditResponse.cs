namespace MatrimonialApi.DTOs.Profile;

public class ContactUnlockAuditItem
{
    public Guid Id { get; set; }
    public Guid UnlockedByUserId { get; set; }
    public string UnlockedByEmail { get; set; } = string.Empty;
    public Guid ProfileUserId { get; set; }
    public string ProfileUserEmail { get; set; } = string.Empty;
    public DateTime UnlockedAt { get; set; }
}

public class ContactUnlockAuditResponse
{
    public List<ContactUnlockAuditItem> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
