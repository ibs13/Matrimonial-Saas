using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Saved;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class SavedProfileService(AppDbContext db)
{
    public async Task<SavedProfileResponse> SaveAsync(Guid userId, Guid targetUserId)
    {
        if (userId == targetUserId)
            throw new ArgumentException("You cannot save your own profile.");

        var targetExists = await db.ProfileIndexes
            .AnyAsync(p => p.Id == targetUserId && p.Status == "Active");

        if (!targetExists)
            throw new KeyNotFoundException("Profile not found.");

        var existing = await db.SavedProfiles
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SavedUserId == targetUserId);

        if (existing is not null)
            throw new InvalidOperationException("Profile is already saved.");

        var saved = new SavedProfile { UserId = userId, SavedUserId = targetUserId };
        db.SavedProfiles.Add(saved);
        await db.SaveChangesAsync();

        var index = await db.ProfileIndexes.FindAsync(targetUserId);
        return BuildResponse(saved, index);
    }

    public async Task RemoveAsync(Guid userId, Guid savedId)
    {
        var saved = await db.SavedProfiles.FindAsync(savedId)
            ?? throw new KeyNotFoundException("Saved profile not found.");

        if (saved.UserId != userId)
            throw new UnauthorizedAccessException("Not your saved profile.");

        db.SavedProfiles.Remove(saved);
        await db.SaveChangesAsync();
    }

    public async Task<List<SavedProfileResponse>> GetAllAsync(Guid userId)
    {
        return await (
            from s in db.SavedProfiles.Where(s => s.UserId == userId)
            join p in db.ProfileIndexes on s.SavedUserId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            orderby s.SavedAt descending
            select new SavedProfileResponse
            {
                Id = s.Id,
                SavedUserId = s.SavedUserId,
                DisplayName = p != null ? p.DisplayName ?? string.Empty : string.Empty,
                Gender = p != null ? p.Gender : null,
                AgeYears = p != null ? p.AgeYears : null,
                Religion = p != null ? p.Religion : null,
                CountryOfResidence = p != null ? p.CountryOfResidence : null,
                Division = p != null ? p.Division : null,
                EducationLevel = p != null ? p.EducationLevel : null,
                CompletionPercentage = p != null ? p.CompletionPercentage : 0,
                SavedAt = s.SavedAt,
            }
        ).ToListAsync();
    }

    private static SavedProfileResponse BuildResponse(SavedProfile saved, ProfileIndex? index) =>
        new()
        {
            Id = saved.Id,
            SavedUserId = saved.SavedUserId,
            DisplayName = index?.DisplayName ?? string.Empty,
            Gender = index?.Gender,
            AgeYears = index?.AgeYears,
            Religion = index?.Religion,
            CountryOfResidence = index?.CountryOfResidence,
            Division = index?.Division,
            EducationLevel = index?.EducationLevel,
            CompletionPercentage = index?.CompletionPercentage ?? 0,
            SavedAt = saved.SavedAt,
        };
}
