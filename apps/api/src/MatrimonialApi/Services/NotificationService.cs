using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Notification;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class NotificationService(AppDbContext db)
{
    public async Task<NotificationListResponse> GetMyAsync(
        Guid userId, int page, int pageSize, bool unreadOnly)
    {
        var baseQuery = db.Notifications.Where(n => n.UserId == userId);
        var filteredQuery = unreadOnly ? baseQuery.Where(n => !n.IsRead) : baseQuery;

        var totalCount = await filteredQuery.CountAsync();
        var unreadCount = await baseQuery.CountAsync(n => !n.IsRead);

        var items = await filteredQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationResponse
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                Title = n.Title,
                Body = n.Body,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt,
            })
            .ToListAsync();

        return new NotificationListResponse
        {
            Items = items,
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    public async Task<int> GetUnreadCountAsync(Guid userId) =>
        await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await db.Notifications.FindAsync(notificationId)
            ?? throw new KeyNotFoundException("Notification not found.");

        if (notification.UserId != userId)
            throw new UnauthorizedAccessException("Not your notification.");

        if (notification.IsRead) return;

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(Guid userId) =>
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow));
}
