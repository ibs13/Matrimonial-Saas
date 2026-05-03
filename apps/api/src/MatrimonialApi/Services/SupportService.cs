using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Support;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class SupportService(AppDbContext pgDb)
{
    // ── User: create ticket with first message ────────────────────────────────

    public async Task<TicketDetailResponse> CreateTicketAsync(Guid userId, CreateTicketRequest req)
    {
        var ticket = new SupportTicket
        {
            UserId = userId,
            Category = req.Category,
            Subject = req.Subject.Trim(),
        };
        pgDb.SupportTickets.Add(ticket);

        pgDb.SupportTicketMessages.Add(new SupportTicketMessage
        {
            TicketId = ticket.Id,
            AuthorId = userId,
            IsStaff = false,
            Body = req.Body.Trim(),
        });

        await pgDb.SaveChangesAsync();
        return await GetTicketDetailAsync(ticket.Id);
    }

    // ── User: list own tickets ────────────────────────────────────────────────

    public async Task<TicketListResponse> GetMyTicketsAsync(Guid userId, int page, int pageSize)
    {
        var query = pgDb.SupportTickets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.UpdatedAt);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TicketResponse
            {
                Id = t.Id,
                Category = t.Category.ToString(),
                Subject = t.Subject,
                Status = t.Status.ToString(),
                MessageCount = t.Messages.Count,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
            })
            .ToListAsync();

        return new TicketListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    // ── User: get own ticket detail ───────────────────────────────────────────

    public async Task<TicketDetailResponse> GetMyTicketDetailAsync(Guid userId, Guid ticketId)
    {
        var ticket = await FetchWithMessagesAsync(ticketId);

        if (ticket.UserId != userId)
            throw new UnauthorizedAccessException("You can only view your own tickets.");

        return MapToDetail(ticket);
    }

    // ── User / Admin: add message ─────────────────────────────────────────────

    public async Task<TicketDetailResponse> AddMessageAsync(
        Guid authorId, Guid ticketId, string body, bool isStaff)
    {
        var ticket = await FetchWithMessagesAsync(ticketId);

        if (!isStaff && ticket.UserId != authorId)
            throw new UnauthorizedAccessException("You can only reply to your own tickets.");

        if (ticket.Status == TicketStatus.Closed)
            throw new InvalidOperationException("Cannot add a message to a closed ticket.");

        ticket.Messages.Add(new SupportTicketMessage
        {
            TicketId = ticketId,
            AuthorId = authorId,
            IsStaff = isStaff,
            Body = body.Trim(),
        });

        ticket.UpdatedAt = DateTime.UtcNow;

        // Auto-advance to InProgress when staff first replies
        if (isStaff && ticket.Status == TicketStatus.Open)
            ticket.Status = TicketStatus.InProgress;

        await pgDb.SaveChangesAsync();
        return MapToDetail(ticket);
    }

    // ── Admin: list all tickets ───────────────────────────────────────────────

    public async Task<AdminTicketListResponse> GetAllTicketsAsync(
        int page, int pageSize, string? status, string? category)
    {
        var query = pgDb.SupportTickets
            .Join(pgDb.Users, t => t.UserId, u => u.Id, (t, u) => new { t, u })
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<TicketStatus>(status, ignoreCase: true, out var statusEnum))
            query = query.Where(x => x.t.Status == statusEnum);

        if (!string.IsNullOrWhiteSpace(category) &&
            Enum.TryParse<TicketCategory>(category, ignoreCase: true, out var categoryEnum))
            query = query.Where(x => x.t.Category == categoryEnum);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(x => x.t.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AdminTicketItem
            {
                Id = x.t.Id,
                UserId = x.t.UserId,
                UserEmail = x.u.Email,
                Category = x.t.Category.ToString(),
                Subject = x.t.Subject,
                Status = x.t.Status.ToString(),
                MessageCount = x.t.Messages.Count,
                CreatedAt = x.t.CreatedAt,
                UpdatedAt = x.t.UpdatedAt,
            })
            .ToListAsync();

        return new AdminTicketListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    // ── Admin: get any ticket detail ──────────────────────────────────────────

    public async Task<AdminTicketDetailResponse> GetTicketDetailForAdminAsync(Guid ticketId)
    {
        var ticket = await FetchWithMessagesAsync(ticketId);

        var user = await pgDb.Users.FindAsync(ticket.UserId);

        return new AdminTicketDetailResponse
        {
            Id = ticket.Id,
            UserId = ticket.UserId,
            UserEmail = user?.Email ?? string.Empty,
            Category = ticket.Category.ToString(),
            Subject = ticket.Subject,
            Status = ticket.Status.ToString(),
            Messages = ticket.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(MapMessage)
                .ToList(),
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
        };
    }

    // ── Admin: update status ──────────────────────────────────────────────────

    public async Task<AdminTicketDetailResponse> UpdateStatusAsync(Guid ticketId, TicketStatus newStatus)
    {
        var ticket = await pgDb.SupportTickets.FindAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        ticket.Status = newStatus;
        ticket.UpdatedAt = DateTime.UtcNow;

        await pgDb.SaveChangesAsync();
        return await GetTicketDetailForAdminAsync(ticketId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<SupportTicket> FetchWithMessagesAsync(Guid ticketId)
    {
        return await pgDb.SupportTickets
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");
    }

    private async Task<TicketDetailResponse> GetTicketDetailAsync(Guid ticketId)
    {
        var ticket = await FetchWithMessagesAsync(ticketId);
        return MapToDetail(ticket);
    }

    private static TicketDetailResponse MapToDetail(SupportTicket ticket) => new()
    {
        Id = ticket.Id,
        Category = ticket.Category.ToString(),
        Subject = ticket.Subject,
        Status = ticket.Status.ToString(),
        Messages = ticket.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(MapMessage)
            .ToList(),
        CreatedAt = ticket.CreatedAt,
        UpdatedAt = ticket.UpdatedAt,
    };

    private static TicketMessageResponse MapMessage(SupportTicketMessage m) => new()
    {
        Id = m.Id,
        IsStaff = m.IsStaff,
        Body = m.Body,
        CreatedAt = m.CreatedAt,
    };
}
