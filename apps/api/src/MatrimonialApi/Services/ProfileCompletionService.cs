using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models.Mongo;

namespace MatrimonialApi.Services;

/// <summary>
/// Stateless, pure calculation — no DB access. Always returns 0–100.
///
/// Weight breakdown:
///   Basic core fields (6 × 5 pts)  = 30  ← all required
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

    /// Minimum completion % before a profile may be set publicly visible.
    public const int MinVisibilityPercentage = 40;

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

    /// Returns all incomplete fields, tagged as required or recommended.
    public static List<ProfileCompletionField> GetMissingFields(Profile profile)
    {
        var missing = new List<ProfileCompletionField>();
        var b = profile.Basic;

        // ── Required (block submission if any are absent) ──────────────────────
        if (b == null || string.IsNullOrWhiteSpace(b.DisplayName))
            missing.Add(new("basic.displayName", "Display name", IsRequired: true));
        if (b?.Gender == null)
            missing.Add(new("basic.gender", "Gender", IsRequired: true));
        if (b?.DateOfBirth == null)
            missing.Add(new("basic.dateOfBirth", "Date of birth", IsRequired: true));
        if (b?.Religion == null)
            missing.Add(new("basic.religion", "Religion", IsRequired: true));
        if (b?.MaritalStatus == null)
            missing.Add(new("basic.maritalStatus", "Marital status", IsRequired: true));
        if (b == null || string.IsNullOrWhiteSpace(b.CountryOfResidence))
            missing.Add(new("basic.countryOfResidence", "Country of residence", IsRequired: true));

        // ── Recommended (improve profile quality) ──────────────────────────────
        if (profile.Physical?.HeightCm == null)
            missing.Add(new("physical.heightCm", "Height", IsRequired: false));
        if (profile.Education?.Level == null)
            missing.Add(new("education.level", "Education level", IsRequired: false));
        if (profile.Career?.EmploymentType == null)
            missing.Add(new("career.employmentType", "Employment type", IsRequired: false));
        if (profile.Family?.FamilyStatus == null)
            missing.Add(new("family.familyStatus", "Family status", IsRequired: false));
        if (profile.Religion?.PrayerHabit == null)
            missing.Add(new("religion.prayerHabit", "Prayer habit", IsRequired: false));
        if (profile.Lifestyle?.Diet == null)
            missing.Add(new("lifestyle.diet", "Diet preference", IsRequired: false));
        if (profile.PartnerExpectations?.AgeMin == null)
            missing.Add(new("partnerExpectations.ageMin", "Partner age (min)", IsRequired: false));
        if (profile.PartnerExpectations?.AgeMax == null)
            missing.Add(new("partnerExpectations.ageMax", "Partner age (max)", IsRequired: false));
        if (profile.Photos.Count == 0)
            missing.Add(new("photos", "Profile photo", IsRequired: false));
        if (string.IsNullOrWhiteSpace(profile.Contact?.Phone))
            missing.Add(new("contact.phone", "Phone number", IsRequired: false));

        return missing;
    }

    public static bool CanSubmit(int completionPercentage) =>
        completionPercentage >= MinSubmitPercentage;

    /// True when all required fields are filled.
    public static bool HasAllRequiredFields(Profile profile) =>
        GetMissingFields(profile).All(f => !f.IsRequired);

    public static bool CanBePublic(int completionPercentage) =>
        completionPercentage >= MinVisibilityPercentage;
}
