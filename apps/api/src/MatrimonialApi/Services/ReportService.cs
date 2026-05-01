using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Admin;
using MatrimonialApi.DTOs.Report;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class ReportService(AppDbContext db)
{
    // ── User: submit a report ─────────────────────────────────────────────────

    public async Task<ReportResponse> SubmitAsync(Guid reporterId, Guid targetUserId, SubmitReportRequest req)
    {
        if (reporterId == targetUserId)
            throw new ArgumentException("You cannot report your own profile.");

        var targetExists = await db.ProfileIndexes
            .AnyAsync(p => p.Id == targetUserId && p.Status == "Active");

        if (!targetExists)
            throw new KeyNotFoundException("Profile not found.");

        var alreadyReported = await db.ProfileReports
            .AnyAsync(r => r.ReporterId == reporterId &&
                           r.ReportedUserId == targetUserId &&
                           r.Status == "Active");

        if (alreadyReported)
            throw new InvalidOperationException("You have already reported this profile.");

        var report = new ProfileReport
        {
            ReporterId = reporterId,
            ReportedUserId = targetUserId,
            Reason = req.Reason,
            Description = req.Description?.Trim(),
        };

        db.ProfileReports.Add(report);
        await db.SaveChangesAsync();

        return new ReportResponse
        {
            Id = report.Id,
            Reason = report.Reason.ToString(),
            Status = report.Status,
            CreatedAt = report.CreatedAt,
        };
    }

    // ── Admin: list reports ───────────────────────────────────────────────────

    public async Task<ReportListResponse> GetReportsAsync(int page, int pageSize, string? status)
    {
        var query = db.ProfileReports.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);
        else
            query = query.Where(r => r.Status == "Active");

        var totalCount = await query.CountAsync();

        var items = await (
            from r in query
            join p in db.ProfileIndexes on r.ReportedUserId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            orderby r.CreatedAt descending
            select new ReportItem
            {
                Id = r.Id,
                ReportedUserId = r.ReportedUserId,
                ReportedDisplayName = p != null ? p.DisplayName ?? string.Empty : string.Empty,
                Reason = r.Reason.ToString(),
                Description = r.Description,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
            }
        )
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

        return new ReportListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    // ── Admin: dismiss a report ───────────────────────────────────────────────

    public async Task<(Guid ReportedUserId, string ReportedDisplayName)> DismissAsync(
        Guid adminId, string adminEmail, Guid reportId)
    {
        var report = await db.ProfileReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Report not found.");

        if (report.Status == "Dismissed")
            throw new InvalidOperationException("Report is already dismissed.");

        report.Status = "Dismissed";
        report.ResolvedAt = DateTime.UtcNow;

        var displayName = (await db.ProfileIndexes.FindAsync(report.ReportedUserId))?.DisplayName ?? string.Empty;

        db.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = "DismissReport",
            EntityType = "ProfileReport",
            EntityId = reportId,
            Reason = null,
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();

        return (report.ReportedUserId, displayName);
    }

    // ── Admin: get reported user ID (used before suspend) ────────────────────

    public async Task<Guid> GetReportedUserIdAsync(Guid reportId)
    {
        var report = await db.ProfileReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Report not found.");

        return report.ReportedUserId;
    }
}
