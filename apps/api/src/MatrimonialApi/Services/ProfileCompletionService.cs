using MatrimonialApi.Models.Mongo;

namespace MatrimonialApi.Services;

/// <summary>
/// Stateless, pure calculation — no DB access. Always returns 0–100.
///
/// Weight breakdown:
///   Basic core fields (6 × 5 pts)  = 30
///   Physical (heightCm)             = 10
///   Education (level)               = 10
///   Career (employmentType)         = 10
///   Family (familyStatus)           =  5
///   Religion (prayerHabit)          =  5
///   Lifestyle (diet)                =  5
///   Partner expectations (age range)= 10  (5 per bound)
///   Photos (≥ 1)                    = 10
///   Contact (phone)                 =  5
///                              Total = 100
/// </summary>
public static class ProfileCompletionService
{
    public const int MinSubmitPercentage = 60;

    public static int Calculate(Profile profile)
    {
        int score = 0;

        if (profile.Basic is { } b)
        {
            if (!string.IsNullOrWhiteSpace(b.DisplayName)) score += 5;
            if (b.Gender.HasValue) score += 5;
            if (b.DateOfBirth.HasValue) score += 5;
            if (b.Religion.HasValue) score += 5;
            if (b.MaritalStatus.HasValue) score += 5;
            if (!string.IsNullOrWhiteSpace(b.CountryOfResidence)) score += 5;
        }

        if (profile.Physical?.HeightCm.HasValue == true) score += 10;
        if (profile.Education?.Level.HasValue == true) score += 10;
        if (profile.Career?.EmploymentType.HasValue == true) score += 10;
        if (profile.Family?.FamilyStatus.HasValue == true) score += 5;
        if (profile.Religion?.PrayerHabit.HasValue == true) score += 5;
        if (profile.Lifestyle?.Diet.HasValue == true) score += 5;

        if (profile.PartnerExpectations is { } pe)
        {
            if (pe.AgeMin.HasValue) score += 5;
            if (pe.AgeMax.HasValue) score += 5;
        }

        if (profile.Photos.Count > 0) score += 10;
        if (!string.IsNullOrWhiteSpace(profile.Contact?.Phone)) score += 5;

        return score;
    }

    public static bool CanSubmit(int completionPercentage) =>
        completionPercentage >= MinSubmitPercentage;
}
