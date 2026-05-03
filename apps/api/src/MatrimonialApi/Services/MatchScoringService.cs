using System.Text.Json;
using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Match;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Mongo;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace MatrimonialApi.Services;

public class MatchScoringService(AppDbContext pgDb, MongoDbContext mongoDb)
{
    private static readonly TimeSpan CacheWindow = TimeSpan.FromHours(24);

    public async Task<RecommendedMatchesResponse> GetRecommendedAsync(Guid userId, bool refresh = false)
    {
        var mongoProfile = await mongoDb.Profiles
            .Find(p => p.Id == userId)
            .FirstOrDefaultAsync();

        var expectations = mongoProfile?.PartnerExpectations;
        var hasPrefs = HasAnyPreference(expectations);

        var latestScoredAt = await pgDb.ProfileMatches
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.ScoredAt)
            .Select(m => (DateTime?)m.ScoredAt)
            .FirstOrDefaultAsync();

        var isStale = latestScoredAt == null || DateTime.UtcNow - latestScoredAt.Value > CacheWindow;

        if (refresh || isStale)
            await ScoreAsync(userId, expectations);

        var rows = await pgDb.ProfileMatches
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.Score)
            .Take(20)
            .Join(
                pgDb.ProfileIndexes,
                m => m.CandidateId,
                p => p.Id,
                (m, p) => new
                {
                    p.Id,
                    p.DisplayName,
                    p.Gender,
                    p.AgeYears,
                    p.Religion,
                    p.MaritalStatus,
                    p.CountryOfResidence,
                    p.Division,
                    p.District,
                    p.EducationLevel,
                    p.EmploymentType,
                    p.HeightCm,
                    p.CompletionPercentage,
                    p.LastActiveAt,
                    p.PhotoUrl,
                    p.IsEmailVerified,
                    p.HasPhone,
                    p.IsIdentityVerified,
                    p.IsPremiumMember,
                    p.Status,
                    m.Score,
                    m.MatchLevel,
                    m.MatchReasons,
                    m.ScoredAt,
                })
            .ToListAsync();

        var items = rows.Select(r => new MatchResultItem
        {
            UserId = r.Id,
            DisplayName = r.DisplayName ?? string.Empty,
            Gender = r.Gender,
            AgeYears = r.AgeYears,
            Religion = r.Religion,
            MaritalStatus = r.MaritalStatus,
            CountryOfResidence = r.CountryOfResidence,
            Division = r.Division,
            District = r.District,
            EducationLevel = r.EducationLevel,
            EmploymentType = r.EmploymentType,
            HeightCm = r.HeightCm,
            CompletionPercentage = r.CompletionPercentage,
            LastActiveAt = r.LastActiveAt,
            PhotoUrl = r.PhotoUrl,
            Badges = new VerificationBadgesDto
            {
                EmailVerified = r.IsEmailVerified,
                PhoneAdded = r.HasPhone,
                PhotoApproved = r.PhotoUrl != null,
                ProfileApproved = r.Status == "Active",
                IdentityVerified = r.IsIdentityVerified,
                IsPremium = r.IsPremiumMember,
            },
            MatchScore = r.Score,
            MatchLevel = r.MatchLevel,
            MatchReasons = JsonSerializer.Deserialize<List<string>>(r.MatchReasons) ?? [],
        }).ToList();

        return new RecommendedMatchesResponse
        {
            Items = items,
            HasPreferences = hasPrefs,
            LastScoredAt = rows.FirstOrDefault()?.ScoredAt,
        };
    }

    private async Task ScoreAsync(Guid userId, PartnerExpectations? expectations)
    {
        var userIndex = await pgDb.ProfileIndexes.FindAsync(userId);
        var targetGender = userIndex?.Gender switch
        {
            "Male" => "Female",
            "Female" => "Male",
            _ => null,
        };

        var query = pgDb.ProfileIndexes
            .Where(p => p.Status == "Active" && p.ProfileVisible && p.Id != userId)
            .AsNoTracking();

        if (targetGender != null)
            query = query.Where(p => p.Gender == targetGender);

        var candidates = await query
            .Select(p => new
            {
                p.Id,
                p.AgeYears,
                p.HeightCm,
                p.Religion,
                p.MaritalStatus,
                p.CountryOfResidence,
                p.EducationLevelOrder,
            })
            .ToListAsync();

        await pgDb.ProfileMatches
            .Where(m => m.UserId == userId)
            .ExecuteDeleteAsync();

        if (candidates.Count == 0) return;

        var now = DateTime.UtcNow;
        var scored = candidates.Select(c =>
        {
            var (score, reasons) = ComputeScore(
                c.AgeYears, c.HeightCm, c.Religion,
                c.MaritalStatus, c.CountryOfResidence,
                c.EducationLevelOrder, expectations);

            return new ProfileMatch
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CandidateId = c.Id,
                Score = score,
                MatchLevel = ScoreToLevel(score),
                MatchReasons = JsonSerializer.Serialize(reasons),
                ScoredAt = now,
            };
        }).ToList();

        pgDb.ProfileMatches.AddRange(scored);
        await pgDb.SaveChangesAsync();
    }

    // ── Scoring rules ────────────────────────────────────────────────────────
    // Total possible: 100 (Religion 25 + Age 20 + Marital 15 + Country 15 + Education 15 + Height 10)
    // No preference set → candidate earns full points for that criterion.
    // No PII (phone, email, NID, address) is used or returned.
    private static (int score, List<string> reasons) ComputeScore(
        int? ageYears, int? heightCm, string? religion, string? maritalStatus,
        string? country, int? educationOrder, PartnerExpectations? exp)
    {
        int score = 0;
        var reasons = new List<string>();

        // Religion (25 pts)
        var acceptedReligions = exp?.AcceptedReligions ?? [];
        if (acceptedReligions.Count == 0)
        {
            score += 25;
        }
        else if (!string.IsNullOrEmpty(religion))
        {
            if (acceptedReligions.Any(r => r.ToString() == religion))
            {
                score += 25;
                reasons.Add("Matches your preferred religion");
            }
        }
        else
        {
            score += 25; // unknown — no penalty
        }

        // Age (20 pts; partial 10 if within ±3 years of range)
        if (exp?.AgeMin == null && exp?.AgeMax == null)
        {
            score += 20;
        }
        else if (ageYears.HasValue)
        {
            var min = exp?.AgeMin ?? 18;
            var max = exp?.AgeMax ?? 80;
            if (ageYears >= min && ageYears <= max)
            {
                score += 20;
                reasons.Add("Age is within your preferred range");
            }
            else if (ageYears >= min - 3 && ageYears <= max + 3)
            {
                score += 10;
            }
        }
        else
        {
            score += 20;
        }

        // Marital status (15 pts)
        var acceptedStatuses = exp?.AcceptedMaritalStatuses ?? [];
        if (acceptedStatuses.Count == 0)
        {
            score += 15;
        }
        else if (!string.IsNullOrEmpty(maritalStatus))
        {
            if (acceptedStatuses.Any(ms => ms.ToString() == maritalStatus))
            {
                score += 15;
                reasons.Add("Preferred marital status");
            }
        }
        else
        {
            score += 15;
        }

        // Country / location (15 pts)
        var preferredCountries = exp?.PreferredCountries ?? [];
        if (preferredCountries.Count == 0)
        {
            score += 15;
        }
        else if (!string.IsNullOrEmpty(country))
        {
            if (preferredCountries.Any(c => string.Equals(c, country, StringComparison.OrdinalIgnoreCase)))
            {
                score += 15;
                reasons.Add("Lives in your preferred location");
            }
        }
        else
        {
            score += 15;
        }

        // Education (15 pts; partial 7 if one level below minimum)
        if (exp?.MinEducationLevel == null)
        {
            score += 15;
        }
        else if (educationOrder.HasValue)
        {
            var minOrder = (int)exp.MinEducationLevel;
            if (educationOrder >= minOrder)
            {
                score += 15;
                reasons.Add("Meets your education preference");
            }
            else if (educationOrder >= minOrder - 1)
            {
                score += 7;
            }
        }
        else
        {
            score += 15;
        }

        // Height (10 pts)
        if (exp?.HeightMinCm == null && exp?.HeightMaxCm == null)
        {
            score += 10;
        }
        else if (heightCm.HasValue)
        {
            var minH = exp?.HeightMinCm ?? 0;
            var maxH = exp?.HeightMaxCm ?? 999;
            if (heightCm >= minH && heightCm <= maxH)
            {
                score += 10;
                reasons.Add("Height is within your preferred range");
            }
        }
        else
        {
            score += 10;
        }

        return (Math.Min(score, 100), reasons);
    }

    private static string ScoreToLevel(int score) => score switch
    {
        >= 85 => "Excellent",
        >= 70 => "Great",
        >= 50 => "Good",
        >= 30 => "Fair",
        _ => "Low",
    };

    private static bool HasAnyPreference(PartnerExpectations? exp) =>
        exp != null && (
            (exp.AcceptedReligions?.Count > 0) ||
            exp.AgeMin != null || exp.AgeMax != null ||
            (exp.AcceptedMaritalStatuses?.Count > 0) ||
            (exp.PreferredCountries?.Count > 0) ||
            exp.MinEducationLevel != null ||
            exp.HeightMinCm != null || exp.HeightMaxCm != null
        );
}
