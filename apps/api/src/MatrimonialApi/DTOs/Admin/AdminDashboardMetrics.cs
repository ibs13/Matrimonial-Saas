namespace MatrimonialApi.DTOs.Admin;

public class AdminDashboardMetrics
{
    public int TotalUsers { get; set; }
    public int VerifiedUsers { get; set; }
    public int NewUsersLast7Days { get; set; }

    public int DraftProfiles { get; set; }
    public int PendingProfiles { get; set; }
    public int ApprovedProfiles { get; set; }
    public int SuspendedProfiles { get; set; }

    public int ActiveReports { get; set; }
    public int PendingPhotos { get; set; }

    public int TotalInterests { get; set; }
    public int AcceptedInterests { get; set; }

    public List<RecentActivityItem> RecentActivity { get; set; } = [];
}

public class RecentActivityItem
{
    public string Action { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}
