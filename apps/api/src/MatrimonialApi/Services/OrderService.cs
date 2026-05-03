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
        await pgDb.SaveChangesAsync();

        return ToOrderResponse(order, attemptCount: 0, latest: null);
    }

    // ── Submit payment ────────────────────────────────────────────────────────

    public async Task<OrderResponse> SubmitPaymentAsync(
        Guid userId, Guid orderId, SubmitPaymentRequest req)
    {
        var order = await pgDb.Orders
            .Include(o => o.PaymentAttempts)
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.UserId != userId)
            throw new UnauthorizedAccessException("Order does not belong to the current user.");

        if (order.Status != OrderStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot submit a payment for an order with status '{order.Status}'.");

        // App-level duplicate transaction ID check (DB unique index is the backstop)
        var txnId = req.TransactionId.Trim();
        var duplicate = await pgDb.PaymentAttempts
            .AnyAsync(pa => pa.GatewayTransactionId == txnId);
        if (duplicate)
            throw new InvalidOperationException(
                "This transaction ID has already been submitted. Please check and try again.");

        var attempt = new PaymentAttempt
        {
            OrderId = orderId,
            UserId = userId,
            AmountBdt = order.AmountBdt,
            Status = PaymentAttemptStatus.Pending,
            GatewayName = req.GatewayName.Trim(),
            GatewayTransactionId = txnId,
        };

        order.Notes = req.Notes?.Trim();
        pgDb.PaymentAttempts.Add(attempt);
        await pgDb.SaveChangesAsync();

        return ToOrderResponse(order, order.PaymentAttempts.Count, attempt);
    }

    // ── Admin: verify payment ─────────────────────────────────────────────────

    public async Task<PaymentAttemptResponse> VerifyPaymentAsync(
        Guid adminId, string adminEmail, Guid attemptId)
    {
        var attempt = await pgDb.PaymentAttempts
            .Include(pa => pa.Order)
            .FirstOrDefaultAsync(pa => pa.Id == attemptId)
            ?? throw new KeyNotFoundException("Payment attempt not found.");

        if (attempt.Status != PaymentAttemptStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot verify an attempt with status '{attempt.Status}'.");

        var now = DateTime.UtcNow;

        attempt.Status = PaymentAttemptStatus.Paid;
        attempt.CompletedAt = now;

        var order = attempt.Order;
        order.Status = OrderStatus.Paid;
        order.PaidAt = now;

        // Upsert UserMembership
        var membership = await pgDb.UserMemberships.FindAsync(order.UserId);
        if (membership is null)
        {
            membership = new UserMembership { UserId = order.UserId };
            pgDb.UserMemberships.Add(membership);
        }
        membership.Plan = order.Plan;
        membership.StartedAt = now;
        membership.ExpiresAt = now.AddDays(order.DurationDays);
        membership.UpdatedAt = now;

        var profileIndex = await pgDb.ProfileIndexes.FindAsync(order.UserId);
        if (profileIndex is not null)
            profileIndex.IsPremiumMember = order.Plan != MembershipPlan.Free;

        pgDb.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = "VerifyPayment",
            EntityType = "PaymentAttempt",
            EntityId = attemptId,
            Reason = $"Verified txn {attempt.GatewayTransactionId} via {attempt.GatewayName}",
        });

        pgDb.Notifications.Add(new Notification
        {
            UserId = order.UserId,
            Type = NotificationType.PaymentVerified,
            Title = "Payment verified",
            Body = $"Your payment for the {order.Plan} plan has been verified. Your membership is now active.",
        });

        await pgDb.SaveChangesAsync();

        return ToAttemptResponse(attempt, order, adminEmail);
    }

    // ── Admin: reject payment ─────────────────────────────────────────────────

    public async Task<PaymentAttemptResponse> RejectPaymentAsync(
        Guid adminId, string adminEmail, Guid attemptId, string reason)
    {
        var attempt = await pgDb.PaymentAttempts
            .Include(pa => pa.Order)
            .FirstOrDefaultAsync(pa => pa.Id == attemptId)
            ?? throw new KeyNotFoundException("Payment attempt not found.");

        if (attempt.Status != PaymentAttemptStatus.Pending)
            throw new InvalidOperationException(
                $"Cannot reject an attempt with status '{attempt.Status}'.");

        var now = DateTime.UtcNow;

        attempt.Status = PaymentAttemptStatus.Failed;
        attempt.FailureReason = reason;
        attempt.CompletedAt = now;

        pgDb.AuditLogs.Add(new AuditLog
        {
            AdminId = adminId,
            AdminEmail = adminEmail,
            Action = "RejectPayment",
            EntityType = "PaymentAttempt",
            EntityId = attemptId,
            Reason = reason,
        });

        pgDb.Notifications.Add(new Notification
        {
            UserId = attempt.Order.UserId,
            Type = NotificationType.PaymentRejected,
            Title = "Payment not verified",
            Body = string.IsNullOrWhiteSpace(reason)
                ? "Your payment could not be verified. Please resubmit with a valid transaction ID."
                : $"Your payment was rejected: {reason}",
        });

        await pgDb.SaveChangesAsync();

        return ToAttemptResponse(attempt, attempt.Order, adminEmail);
    }

    // ── User: billing history ─────────────────────────────────────────────────

    public async Task<OrderListResponse> GetMyOrdersAsync(Guid userId, int page, int pageSize)
    {
        var baseQuery = pgDb.Orders.Where(o => o.UserId == userId);
        var totalCount = await baseQuery.CountAsync();

        var orders = await baseQuery
            .Include(o => o.PaymentAttempts)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = orders.Select(o =>
        {
            var latest = o.PaymentAttempts.OrderByDescending(pa => pa.AttemptedAt).FirstOrDefault();
            return ToOrderResponse(o, o.PaymentAttempts.Count, latest);
        }).ToList();

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

    private static OrderResponse ToOrderResponse(Order order, int attemptCount, PaymentAttempt? latest) => new()
    {
        Id = order.Id,
        Plan = order.Plan.ToString(),
        AmountBdt = order.AmountBdt,
        Status = order.Status.ToString(),
        DurationDays = order.DurationDays,
        AttemptCount = attemptCount,
        CreatedAt = order.CreatedAt,
        PaidAt = order.PaidAt,
        LatestAttemptId = latest?.Id,
        LatestAttemptStatus = latest?.Status.ToString(),
        LatestGatewayName = latest?.GatewayName,
        LatestTransactionId = latest?.GatewayTransactionId,
        LatestFailureReason = latest?.FailureReason,
    };

    private static PaymentAttemptResponse ToAttemptResponse(PaymentAttempt pa, Order o, string userEmail) => new()
    {
        Id = pa.Id,
        OrderId = pa.OrderId,
        UserId = pa.UserId,
        UserEmail = userEmail,
        Plan = o.Plan.ToString(),
        AmountBdt = pa.AmountBdt,
        Status = pa.Status.ToString(),
        GatewayName = pa.GatewayName,
        GatewayTransactionId = pa.GatewayTransactionId,
        FailureReason = pa.FailureReason,
        AttemptedAt = pa.AttemptedAt,
        CompletedAt = pa.CompletedAt,
    };
}
