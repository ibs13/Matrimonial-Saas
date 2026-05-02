using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Membership;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public record MembershipPlanDefinition(
    MembershipPlan Plan,
    string Tagline,
    int MonthlyInterestLimit,   // -1 = unlimited
    bool AdvancedSearch,
    bool ProfileBoost,
    bool ContactUnlock,
    decimal MonthlyPriceBdt);

public class MembershipService(AppDbContext pgDb)
{
    public static readonly IReadOnlyDictionary<MembershipPlan, MembershipPlanDefinition> Plans =
        new Dictionary<MembershipPlan, MembershipPlanDefinition>
        {
            [MembershipPlan.Free]    = new(MembershipPlan.Free,    "Get started for free",          5,  false, false, false,    0),
            [MembershipPlan.Basic]   = new(MembershipPlan.Basic,   "More reach, smarter search",   20,  true,  false, false,  299),
            [MembershipPlan.Premium] = new(MembershipPlan.Premium, "Stand out from the crowd",     50,  true,  true,  false,  799),
            [MembershipPlan.Vip]     = new(MembershipPlan.Vip,     "Unlimited access, every tool", -1,  true,  true,  true,  1999),
        };

    public static IReadOnlyList<PlanDetails> AllPlans { get; } =
        Plans.Values
             .Select(d => new PlanDetails
             {
                 Plan = d.Plan.ToString(),
                 Tagline = d.Tagline,
                 MonthlyInterestLimit = d.MonthlyInterestLimit,
                 AdvancedSearch = d.AdvancedSearch,
                 ProfileBoost = d.ProfileBoost,
                 ContactUnlock = d.ContactUnlock,
                 MonthlyPriceBdt = d.MonthlyPriceBdt,
             })
             .ToList();

    public async Task<UserMembershipResponse> GetMyMembershipAsync(Guid userId)
    {
        var membership = await pgDb.UserMemberships.FindAsync(userId);
        var plan = ResolvePlan(membership);
        var def = Plans[plan];

        var startOfMonth = StartOfCurrentMonth();
        var sentThisMonth = await pgDb.InterestRequests
            .CountAsync(r => r.SenderId == userId && r.SentAt >= startOfMonth);

        return new UserMembershipResponse
        {
            Plan = plan.ToString(),
            StartedAt = membership?.StartedAt ?? DateTime.UtcNow,
            ExpiresAt = membership?.ExpiresAt,
            MonthlyInterestLimit = def.MonthlyInterestLimit,
            InterestsSentThisMonth = sentThisMonth,
            RemainingInterests = def.MonthlyInterestLimit == -1
                ? null
                : Math.Max(0, def.MonthlyInterestLimit - sentThisMonth),
            AdvancedSearch = def.AdvancedSearch,
            ProfileBoost = def.ProfileBoost,
            ContactUnlock = def.ContactUnlock,
            MonthlyPriceBdt = def.MonthlyPriceBdt,
        };
    }

    /// <summary>Returns true when the user is allowed to send another interest request this month.</summary>
    public async Task<bool> CanSendInterestThisMonthAsync(Guid userId)
    {
        var membership = await pgDb.UserMemberships.FindAsync(userId);
        var def = Plans[ResolvePlan(membership)];

        if (def.MonthlyInterestLimit == -1) return true;

        var startOfMonth = StartOfCurrentMonth();
        var sent = await pgDb.InterestRequests
            .CountAsync(r => r.SenderId == userId && r.SentAt >= startOfMonth);

        return sent < def.MonthlyInterestLimit;
    }

    private static MembershipPlan ResolvePlan(UserMembership? membership)
    {
        if (membership is null) return MembershipPlan.Free;
        if (membership.ExpiresAt.HasValue && membership.ExpiresAt.Value < DateTime.UtcNow)
            return MembershipPlan.Free;
        return membership.Plan;
    }

    private static DateTime StartOfCurrentMonth()
    {
        var now = DateTime.UtcNow;
        return new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }
}
