using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Chat;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class ChatService(AppDbContext db)
{
    // ── Access guards ─────────────────────────────────────────────────────────

    /// <summary>
    /// Checks everything needed to VIEW a thread:
    /// sender must be active, accepted interest must exist, no block.
    /// </summary>
    private async Task ValidateThreadAccessAsync(Guid userId, Guid otherUserId)
    {
        if (userId == otherUserId)
            throw new ArgumentException("You cannot chat with yourself.");

        var me = await db.Users.FindAsync(userId);
        if (me is null || !me.IsActive)
            throw new UnauthorizedAccessException("Your account is not active.");

        var hasAccepted = await db.InterestRequests.AnyAsync(r =>
            ((r.SenderId == userId && r.ReceiverId == otherUserId) ||
             (r.SenderId == otherUserId && r.ReceiverId == userId)) &&
            r.Status == InterestRequestStatus.Accepted);

        if (!hasAccepted)
            throw new InvalidOperationException(
                "Chat is only available after an interest request has been accepted.");
    }

    /// <summary>
    /// Additional checks for SENDING: both profiles must be Active, no block in either direction.
    /// </summary>
    private async Task ValidateSendAsync(Guid senderId, Guid otherUserId)
    {
        await ValidateThreadAccessAsync(senderId, otherUserId);

        var myProfile = await db.ProfileIndexes.FindAsync(senderId);
        if (myProfile is null || myProfile.Status != "Active")
            throw new InvalidOperationException("Your profile must be active to send messages.");

        var otherProfile = await db.ProfileIndexes.FindAsync(otherUserId);
        if (otherProfile is null || otherProfile.Status != "Active")
            throw new InvalidOperationException("The recipient does not have an active profile.");

        var blocked = await db.UserBlocks.AnyAsync(b =>
            (b.BlockerId == senderId && b.BlockedId == otherUserId) ||
            (b.BlockerId == otherUserId && b.BlockedId == senderId));

        if (blocked)
            throw new InvalidOperationException(
                "You cannot send messages — one of you has blocked the other.");
    }

    // ── Conversation helpers ──────────────────────────────────────────────────

    private static (Guid lo, Guid hi) OrderPair(Guid a, Guid b) =>
        a < b ? (a, b) : (b, a);

    private async Task<Conversation?> FindConversationAsync(Guid u1, Guid u2)
    {
        var (lo, hi) = OrderPair(u1, u2);
        return await db.Conversations
            .FirstOrDefaultAsync(c => c.User1Id == lo && c.User2Id == hi);
    }

    private async Task<Conversation> GetOrCreateConversationAsync(Guid u1, Guid u2)
    {
        var conv = await FindConversationAsync(u1, u2);
        if (conv is not null) return conv;

        var (lo, hi) = OrderPair(u1, u2);
        conv = new Conversation { User1Id = lo, User2Id = hi };
        db.Conversations.Add(conv);
        await db.SaveChangesAsync();
        return conv;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<List<ConversationListItem>> GetConversationsAsync(Guid userId)
    {
        var convs = await db.Conversations
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync();

        if (convs.Count == 0) return [];

        var otherIds = convs.Select(c => c.User1Id == userId ? c.User2Id : c.User1Id).ToList();
        var convIds = convs.Select(c => c.Id).ToList();

        // Batch-fetch profile display data
        var profiles = await db.ProfileIndexes
            .Where(p => otherIds.Contains(p.Id))
            .Select(p => new { p.Id, p.DisplayName, p.PhotoUrl })
            .ToDictionaryAsync(p => p.Id);

        // Batch unread count per conversation
        var unreadBatch = await db.Messages
            .Where(m => convIds.Contains(m.ConversationId) && m.SenderId != userId &&
                        !db.MessageReads.Any(r => r.MessageId == m.Id && r.ReaderId == userId))
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConvId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConvId, x => x.Count);

        // Batch last message
        var lastMsgs = await db.Messages
            .Where(m => convIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => new
            {
                ConvId = g.Key,
                Body = g.OrderByDescending(m => m.CreatedAt).Select(m => m.Body).FirstOrDefault(),
                At = g.Max(m => m.CreatedAt),
            })
            .ToDictionaryAsync(x => x.ConvId);

        // Batch block check
        var blockedOtherIds = await db.UserBlocks
            .Where(b =>
                (b.BlockerId == userId && otherIds.Contains(b.BlockedId)) ||
                (b.BlockedId == userId && otherIds.Contains(b.BlockerId)))
            .Select(b => b.BlockerId == userId ? b.BlockedId : b.BlockerId)
            .ToListAsync();
        var blockedSet = blockedOtherIds.ToHashSet();

        return convs.Select(c =>
        {
            var otherId = c.User1Id == userId ? c.User2Id : c.User1Id;
            profiles.TryGetValue(otherId, out var prof);
            lastMsgs.TryGetValue(c.Id, out var last);
            unreadBatch.TryGetValue(c.Id, out var unread);

            var preview = last?.Body is { Length: > 60 } b ? b[..60] + "…" : last?.Body;

            return new ConversationListItem
            {
                ConversationId = c.Id,
                OtherUserId = otherId,
                OtherDisplayName = prof?.DisplayName ?? "Unknown",
                OtherPhotoUrl = prof?.PhotoUrl,
                LastMessage = preview,
                LastMessageAt = last?.At,
                UnreadCount = unread,
                IsBlocked = blockedSet.Contains(otherId),
            };
        }).ToList();
    }

    public async Task<MessageThreadResponse> GetThreadAsync(
        Guid userId, Guid otherUserId, int page, int pageSize)
    {
        await ValidateThreadAccessAsync(userId, otherUserId);

        var otherProf = await db.ProfileIndexes
            .Where(p => p.Id == otherUserId)
            .Select(p => new { p.DisplayName, p.PhotoUrl })
            .FirstOrDefaultAsync();

        var isBlocked = await db.UserBlocks.AnyAsync(b =>
            (b.BlockerId == userId && b.BlockedId == otherUserId) ||
            (b.BlockerId == otherUserId && b.BlockedId == userId));

        var conv = await FindConversationAsync(userId, otherUserId);
        if (conv is null)
        {
            return new MessageThreadResponse
            {
                ConversationId = null,
                OtherUserId = otherUserId,
                OtherDisplayName = otherProf?.DisplayName ?? "Unknown",
                OtherPhotoUrl = otherProf?.PhotoUrl,
                Messages = [],
                TotalCount = 0,
                Page = page,
                PageSize = pageSize,
                TotalPages = 0,
                IsBlocked = isBlocked,
            };
        }

        // Return newest pageSize messages in chronological order (ascending for display)
        var total = await db.Messages.CountAsync(m => m.ConversationId == conv.Id);

        var msgs = await db.Messages
            .Where(m => m.ConversationId == conv.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MessageResponse
            {
                Id = m.Id,
                SenderId = m.SenderId,
                Body = m.Body,
                CreatedAt = m.CreatedAt,
                IsRead = db.MessageReads.Any(r => r.MessageId == m.Id),
            })
            .ToListAsync();

        msgs.Reverse(); // oldest-first for rendering

        return new MessageThreadResponse
        {
            ConversationId = conv.Id,
            OtherUserId = otherUserId,
            OtherDisplayName = otherProf?.DisplayName ?? "Unknown",
            OtherPhotoUrl = otherProf?.PhotoUrl,
            Messages = msgs,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize),
            IsBlocked = isBlocked,
        };
    }

    public async Task<MessageResponse> SendMessageAsync(
        Guid senderId, Guid otherUserId, SendMessageRequest req)
    {
        await ValidateSendAsync(senderId, otherUserId);

        var conv = await GetOrCreateConversationAsync(senderId, otherUserId);

        var message = new Message
        {
            ConversationId = conv.Id,
            SenderId = senderId,
            Body = req.Body,
        };

        conv.LastMessageAt = DateTime.UtcNow;
        db.Messages.Add(message);

        var senderName = (await db.ProfileIndexes
            .Where(p => p.Id == senderId)
            .Select(p => p.DisplayName)
            .FirstOrDefaultAsync()) ?? "Someone";

        db.Notifications.Add(new Notification
        {
            UserId = otherUserId,
            Type = NotificationType.NewMessage,
            Title = "New message",
            Body = $"{senderName} sent you a message.",
        });

        await db.SaveChangesAsync();

        return new MessageResponse
        {
            Id = message.Id,
            SenderId = message.SenderId,
            Body = message.Body,
            CreatedAt = message.CreatedAt,
            IsRead = false,
        };
    }

    public async Task MarkReadAsync(Guid userId, Guid otherUserId)
    {
        var conv = await FindConversationAsync(userId, otherUserId);
        if (conv is null) return;

        var unreadIds = await db.Messages
            .Where(m => m.ConversationId == conv.Id && m.SenderId != userId)
            .Where(m => !db.MessageReads.Any(r => r.MessageId == m.Id && r.ReaderId == userId))
            .Select(m => m.Id)
            .ToListAsync();

        if (unreadIds.Count == 0) return;

        var now = DateTime.UtcNow;
        db.MessageReads.AddRange(unreadIds.Select(mid => new MessageRead
        {
            MessageId = mid,
            ReaderId = userId,
            ReadAt = now,
        }));

        await db.SaveChangesAsync();
    }

    public async Task BlockUserAsync(Guid blockerId, Guid blockedId)
    {
        if (blockerId == blockedId)
            throw new ArgumentException("You cannot block yourself.");

        var exists = await db.UserBlocks.AnyAsync(
            b => b.BlockerId == blockerId && b.BlockedId == blockedId);

        if (exists) return; // idempotent

        db.UserBlocks.Add(new UserBlock { BlockerId = blockerId, BlockedId = blockedId });
        await db.SaveChangesAsync();
    }

    public async Task UnblockUserAsync(Guid blockerId, Guid blockedId)
    {
        await db.UserBlocks
            .Where(b => b.BlockerId == blockerId && b.BlockedId == blockedId)
            .ExecuteDeleteAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        var myConvIds = await db.Conversations
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .Select(c => c.Id)
            .ToListAsync();

        if (myConvIds.Count == 0) return 0;

        return await db.Messages
            .Where(m => myConvIds.Contains(m.ConversationId) && m.SenderId != userId)
            .CountAsync(m => !db.MessageReads.Any(r => r.MessageId == m.Id && r.ReaderId == userId));
    }
}
