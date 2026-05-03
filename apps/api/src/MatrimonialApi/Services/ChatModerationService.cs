using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Admin;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class ChatModerationService(AppDbContext db)
{
    public async Task<MessageReportListResponse> GetReportsAsync(int page, int pageSize, string? status)
    {
        var query = db.MessageReports.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync();

        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.MessageId,
                r.ReporterId,
                r.Reason,
                r.Status,
                r.CreatedAt,
                MessageBody = r.Message.Body,
                ConversationId = r.Message.ConversationId,
                SenderId = r.Message.SenderId,
                IsConversationClosed = r.Message.Conversation.IsClosed,
            })
            .ToListAsync();

        // Batch-fetch display names for reporters and senders
        var userIds = reports
            .SelectMany(r => new[] { r.ReporterId, r.SenderId })
            .Distinct()
            .ToList();

        var names = await db.ProfileIndexes
            .Where(p => userIds.Contains(p.Id))
            .Select(p => new { p.Id, p.DisplayName })
            .ToDictionaryAsync(p => p.Id, p => p.DisplayName ?? "Unknown");

        var items = reports.Select(r => new MessageReportItem
        {
            ReportId = r.Id,
            MessageId = r.MessageId,
            MessageBody = r.MessageBody,
            ConversationId = r.ConversationId,
            ReporterId = r.ReporterId,
            ReporterName = names.GetValueOrDefault(r.ReporterId, "Unknown"),
            SenderId = r.SenderId,
            SenderName = names.GetValueOrDefault(r.SenderId, "Unknown"),
            Reason = r.Reason,
            Status = r.Status,
            CreatedAt = r.CreatedAt,
            IsConversationClosed = r.IsConversationClosed,
        }).ToList();

        return new MessageReportListResponse
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize),
        };
    }

    public async Task DismissReportAsync(Guid adminId, string adminEmail, Guid reportId)
    {
        var report = await db.MessageReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Message report not found.");

        if (report.Status == "Dismissed")
            return; // idempotent

        report.Status = "Dismissed";
        report.ReviewedByAdminId = adminId;
        report.ReviewedAt = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = "DismissMessageReport",
            EntityType = "MessageReport",
            EntityId = reportId,
        });

        await db.SaveChangesAsync();
    }

    public async Task CloseConversationAsync(Guid adminId, string adminEmail, Guid conversationId)
    {
        var conv = await db.Conversations.FindAsync(conversationId)
            ?? throw new KeyNotFoundException("Conversation not found.");

        if (conv.IsClosed)
            return; // idempotent

        conv.IsClosed = true;
        conv.ClosedAt = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = "CloseConversation",
            EntityType = "Conversation",
            EntityId = conversationId,
        });

        await db.SaveChangesAsync();
    }
}
