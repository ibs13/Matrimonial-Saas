using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Billing;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class OrderService(AppDbContext pgDb)
{
    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<OrderResponse> CreateOrderAsync(Guid userId, string planName)
    {
        if (!Enum.TryParse<MembershipPlan>(planName, ignoreCase: true, out var plan))
            throw new ArgumentException($"Unknown plan '{planName}'.");

        if (plan == MembershipPlan.Free)
            throw new ArgumentException("Cannot create an order for the Free plan.");

        var def = MembershipService.Plans[plan];

        var order = new Order
        {
            UserId = userId,
            Plan = plan,
            AmountBdt = def.MonthlyPriceBdt,
            DurationDays = 30,
            Status = OrderStatus.Pending,
        };

        pgDb.Orders.Add(order);

        // One Pending attempt is created immediately; the gateway will update it on callback
        pgDb.PaymentAttempts.Add(new PaymentAttempt
        {
            OrderId = order.Id,
            UserId = userId,
            AmountBdt = def.MonthlyPriceBdt,
            Status = PaymentAttemptStatus.Pending,
        });

        await pgDb.SaveChangesAsync();

        return ToOrderResponse(order, attemptCount: 1);
    }

    // ── User: billing history ─────────────────────────────────────────────────

    public async Task<OrderListResponse> GetMyOrdersAsync(Guid userId, int page, int pageSize)
    {
        var baseQuery = pgDb.Orders.Where(o => o.UserId == userId);

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderResponse
            {
                Id = o.Id,
                Plan = o.Plan.ToString(),
                AmountBdt = o.AmountBdt,
                Status = o.Status.ToString(),
                DurationDays = o.DurationDays,
                AttemptCount = o.PaymentAttempts.Count,
                CreatedAt = o.CreatedAt,
                PaidAt = o.PaidAt,
            })
            .ToListAsync();

        return new OrderListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    // ── Admin: all payment attempts ───────────────────────────────────────────

    public async Task<PaymentAttemptListResponse> GetPaymentAttemptsAsync(
        PaymentAttemptListRequest req)
    {
        var baseQuery =
            from pa in pgDb.PaymentAttempts
            join o  in pgDb.Orders on pa.OrderId equals o.Id
            join u  in pgDb.Users  on pa.UserId  equals u.Id
            select new { pa, o, u };

        if (!string.IsNullOrWhiteSpace(req.Status) &&
            Enum.TryParse<PaymentAttemptStatus>(req.Status, ignoreCase: true, out var statusFilter))
            baseQuery = baseQuery.Where(x => x.pa.Status == statusFilter);

        if (!string.IsNullOrWhiteSpace(req.Plan) &&
            Enum.TryParse<MembershipPlan>(req.Plan, ignoreCase: true, out var planFilter))
            baseQuery = baseQuery.Where(x => x.o.Plan == planFilter);

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(x => x.pa.AttemptedAt)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new PaymentAttemptResponse
            {
                Id = x.pa.Id,
                OrderId = x.pa.OrderId,
                UserId = x.pa.UserId,
                UserEmail = x.u.Email,
                Plan = x.o.Plan.ToString(),
                AmountBdt = x.pa.AmountBdt,
                Status = x.pa.Status.ToString(),
                GatewayName = x.pa.GatewayName,
                GatewayTransactionId = x.pa.GatewayTransactionId,
                FailureReason = x.pa.FailureReason,
                AttemptedAt = x.pa.AttemptedAt,
                CompletedAt = x.pa.CompletedAt,
            })
            .ToListAsync();

        return new PaymentAttemptListResponse
        {
            Items = items,
            TotalCount = totalCount,
            Page = req.Page,
            PageSize = req.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)req.PageSize),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static OrderResponse ToOrderResponse(Order order, int attemptCount) => new()
    {
        Id = order.Id,
        Plan = order.Plan.ToString(),
        AmountBdt = order.AmountBdt,
        Status = order.Status.ToString(),
        DurationDays = order.DurationDays,
        AttemptCount = attemptCount,
        CreatedAt = order.CreatedAt,
        PaidAt = order.PaidAt,
    };
}
