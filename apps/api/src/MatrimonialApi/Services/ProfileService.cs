using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Profile;
using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using MatrimonialApi.Models.Mongo;
using MatrimonialApi.Storage;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace MatrimonialApi.Services;

public class ProfileService(AppDbContext pgDb, MongoDbContext mongoDb, IPhotoStorage photoStorage)
{
    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<ProfileResponse> CreateAsync(Guid userId)
    {
        var exists = await mongoDb.Profiles
            .Find(p => p.Id == userId)
            .AnyAsync();

        if (exists)
            throw new InvalidOperationException("You already have a profile.");

        var profile = new Profile { Id = userId };
        await mongoDb.Profiles.InsertOneAsync(profile);
        await SyncIndexAsync(profile);

        return ToResponse(profile);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public async Task<ProfileResponse> GetMyProfileAsync(Guid userId)
    {
        var profile = await GetOrThrowAsync(userId);
        return ToResponse(profile);
    }

    // ── Section updates ───────────────────────────────────────────────────────

    public async Task<ProfileResponse> UpdateBasicAsync(Guid userId, UpdateBasicInfoRequest req)
    {
        var minDob = DateTime.UtcNow.AddYears(-18);
        if (req.DateOfBirth > minDob)
            throw new ArgumentException("You must be at least 18 years old.");

        var profile = await GetOrThrowAsync(userId);

        profile.Basic = new BasicInfo
        {
            DisplayName = req.DisplayName,
            FullName = req.FullName,
            Gender = req.Gender,
            DateOfBirth = req.DateOfBirth,
            Religion = req.Religion,
            MaritalStatus = req.MaritalStatus,
            Nationality = req.Nationality ?? "Bangladeshi",
            MotherTongue = req.MotherTongue ?? "Bengali",
            CountryOfResidence = req.CountryOfResidence,
            Division = req.Division,
            District = req.District,
            AboutMe = req.AboutMe,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdatePhysicalAsync(Guid userId, UpdatePhysicalInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Physical = new PhysicalInfo
        {
            HeightCm = req.HeightCm,
            WeightKg = req.WeightKg,
            BodyType = req.BodyType,
            Complexion = req.Complexion,
            BloodGroup = req.BloodGroup,
            HasPhysicalDisability = req.HasPhysicalDisability,
            PhysicalDisabilityDetails = req.PhysicalDisabilityDetails,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateEducationAsync(Guid userId, UpdateEducationInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Education = new EducationInfo
        {
            Level = req.Level,
            FieldOfStudy = req.FieldOfStudy,
            Institution = req.Institution,
            GraduationYear = req.GraduationYear,
            AdditionalQualifications = req.AdditionalQualifications,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateCareerAsync(Guid userId, UpdateCareerInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Career = new CareerInfo
        {
            EmploymentType = req.EmploymentType,
            Occupation = req.Occupation,
            Organization = req.Organization,
            AnnualIncome = req.AnnualIncome,
            IncomeCurrency = req.IncomeCurrency ?? "BDT",
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateFamilyAsync(Guid userId, UpdateFamilyInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Family = new FamilyInfo
        {
            FatherOccupation = req.FatherOccupation,
            MotherOccupation = req.MotherOccupation,
            NumberOfBrothers = req.NumberOfBrothers,
            NumberOfSisters = req.NumberOfSisters,
            FamilyStatus = req.FamilyStatus,
            FamilyType = req.FamilyType,
            FamilyCountry = req.FamilyCountry,
            FamilyDivision = req.FamilyDivision,
            FamilyDistrict = req.FamilyDistrict,
            AboutFamily = req.AboutFamily,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateReligionAsync(Guid userId, UpdateReligionInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Religion = new ReligionInfo
        {
            Sect = req.Sect,
            PrayerHabit = req.PrayerHabit,
            WearsHijab = req.WearsHijab,
            WearsBeard = req.WearsBeard,
            Mazhab = req.Mazhab,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateLifestyleAsync(Guid userId, UpdateLifestyleInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Lifestyle = new LifestyleInfo
        {
            Diet = req.Diet,
            Smoking = req.Smoking,
            Hobbies = req.Hobbies,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdatePartnerExpectationsAsync(Guid userId, UpdatePartnerExpectationsRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        if (req.AgeMin.HasValue && req.AgeMax.HasValue && req.AgeMin > req.AgeMax)
            throw new ArgumentException("AgeMin cannot be greater than AgeMax.");

        if (req.HeightMinCm.HasValue && req.HeightMaxCm.HasValue && req.HeightMinCm > req.HeightMaxCm)
            throw new ArgumentException("HeightMinCm cannot be greater than HeightMaxCm.");

        profile.PartnerExpectations = new PartnerExpectations
        {
            AgeMin = req.AgeMin,
            AgeMax = req.AgeMax,
            HeightMinCm = req.HeightMinCm,
            HeightMaxCm = req.HeightMaxCm,
            MinEducationLevel = req.MinEducationLevel,
            AcceptedMaritalStatuses = req.AcceptedMaritalStatuses,
            AcceptedReligions = req.AcceptedReligions,
            PreferredCountries = req.PreferredCountries,
            MinFamilyStatus = req.MinFamilyStatus,
            AdditionalExpectations = req.AdditionalExpectations,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateContactAsync(Guid userId, UpdateContactInfoRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Contact = new ContactInfo
        {
            Phone = req.Phone,
            GuardianPhone = req.GuardianPhone,
            PresentAddress = req.PresentAddress,
            PermanentAddress = req.PermanentAddress,
        };

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdateVisibilityAsync(Guid userId, UpdateVisibilityRequest req)
    {
        var profile = await GetOrThrowAsync(userId);

        profile.Visibility = new ProfileVisibility
        {
            ShowFullName = req.ShowFullName,
            ShowPhone = req.ShowPhone,
            ShowAddress = req.ShowAddress,
            ProfileVisible = req.ProfileVisible,
        };

        return await SaveAsync(profile);
    }

    // ── Photo ─────────────────────────────────────────────────────────────────

    public async Task<ProfileResponse> UploadPhotoAsync(Guid userId, IFormFile file, CancellationToken ct = default)
    {
        var profile = await GetOrThrowAsync(userId);

        if (profile.Photos.Count > 0)
            throw new InvalidOperationException("You already have a profile photo. Delete it first to upload a new one.");

        var url = await photoStorage.SaveAsync(file, userId, ct);

        profile.Photos.Add(new ProfilePhoto
        {
            Url = url,
            Visibility = PhotoVisibility.Public,
            Status = PhotoStatus.Pending,
            UploadedAt = DateTime.UtcNow,
        });

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> UpdatePhotoVisibilityAsync(Guid userId, PhotoVisibility visibility)
    {
        var profile = await GetOrThrowAsync(userId);

        var photo = profile.Photos.FirstOrDefault()
            ?? throw new KeyNotFoundException("No photo found. Upload a photo first.");

        photo.Visibility = visibility;

        return await SaveAsync(profile);
    }

    public async Task<ProfileResponse> DeletePhotoAsync(Guid userId, CancellationToken ct = default)
    {
        var profile = await GetOrThrowAsync(userId);

        var photo = profile.Photos.FirstOrDefault()
            ?? throw new KeyNotFoundException("No photo found.");

        await photoStorage.DeleteAsync(photo.Url, ct);
        profile.Photos.Clear();

        return await SaveAsync(profile);
    }

    public async Task<string?> GetPhotoUrlForViewerAsync(Guid viewerUserId, Guid profileUserId)
    {
        var profile = await mongoDb.Profiles
            .Find(p => p.Id == profileUserId)
            .FirstOrDefaultAsync();

        if (profile is null) return null;

        var photo = profile.Photos.FirstOrDefault();
        if (photo is null || photo.Status != PhotoStatus.Approved) return null;

        return photo.Visibility switch
        {
            PhotoVisibility.Public => photo.Url,
            PhotoVisibility.Hidden => null,
            PhotoVisibility.ApprovedUsersOnly => await HasAcceptedInterestAsync(viewerUserId, profileUserId)
                ? photo.Url
                : null,
            _ => null,
        };
    }

    private async Task<bool> HasAcceptedInterestAsync(Guid viewerUserId, Guid profileUserId)
    {
        return await pgDb.InterestRequests.AnyAsync(r =>
            r.Status == InterestRequestStatus.Accepted &&
            ((r.SenderId == viewerUserId && r.ReceiverId == profileUserId) ||
             (r.SenderId == profileUserId && r.ReceiverId == viewerUserId)));
    }

    // ── Submit for review ─────────────────────────────────────────────────────

    public async Task<ProfileResponse> SubmitForReviewAsync(Guid userId)
    {
        var user = await pgDb.Users.FindAsync(userId);
        if (user is null || !user.IsEmailVerified)
            throw new InvalidOperationException(
                "Please verify your email address before submitting your profile.");

        var profile = await GetOrThrowAsync(userId);

        if (profile.Status is not (ProfileStatus.Draft or ProfileStatus.Paused))
            throw new InvalidOperationException(
                $"Profile cannot be submitted from status '{profile.Status}'. Only Draft or Paused profiles can be submitted.");

        if (!ProfileCompletionService.CanSubmit(profile.CompletionPercentage))
            throw new InvalidOperationException(
                $"Profile must be at least {ProfileCompletionService.MinSubmitPercentage}% complete to submit. " +
                $"Current completion: {profile.CompletionPercentage}%.");

        profile.Status = ProfileStatus.PendingReview;
        return await SaveAsync(profile);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private async Task<Profile> GetOrThrowAsync(Guid userId)
    {
        var profile = await mongoDb.Profiles
            .Find(p => p.Id == userId)
            .FirstOrDefaultAsync();

        if (profile is null)
            throw new KeyNotFoundException("Profile not found. Use POST /api/profile to create one.");

        return profile;
    }

    private async Task<ProfileResponse> SaveAsync(Profile profile)
    {
        profile.CompletionPercentage = ProfileCompletionService.Calculate(profile);
        profile.UpdatedAt = DateTime.UtcNow;
        profile.LastActiveAt = DateTime.UtcNow;

        await mongoDb.Profiles.ReplaceOneAsync(
            p => p.Id == profile.Id,
            profile,
            new ReplaceOptions { IsUpsert = false });

        await SyncIndexAsync(profile);

        return ToResponse(profile);
    }

    private async Task SyncIndexAsync(Profile profile)
    {
        var existing = await pgDb.ProfileIndexes.FindAsync(profile.Id);
        var ageYears = profile.Basic?.DateOfBirth.HasValue == true
            ? ComputeAge(profile.Basic.DateOfBirth.Value)
            : (int?)null;

        if (existing is null)
        {
            pgDb.ProfileIndexes.Add(BuildIndex(profile, ageYears));
        }
        else
        {
            existing.DisplayName = profile.Basic?.DisplayName;
            existing.Gender = profile.Basic?.Gender?.ToString();
            existing.Religion = profile.Basic?.Religion?.ToString();
            existing.MaritalStatus = profile.Basic?.MaritalStatus?.ToString();
            existing.CountryOfResidence = profile.Basic?.CountryOfResidence;
            existing.Division = profile.Basic?.Division;
            existing.District = profile.Basic?.District;
            existing.AgeYears = ageYears;
            existing.HeightCm = profile.Physical?.HeightCm;
            existing.EducationLevel = profile.Education?.Level?.ToString();
            existing.EducationLevelOrder = profile.Education?.Level.HasValue == true
                ? (int)profile.Education.Level.Value : (int?)null;
            existing.EmploymentType = profile.Career?.EmploymentType?.ToString();
            existing.Status = profile.Status.ToString();
            existing.ProfileVisible = profile.Visibility.ProfileVisible;
            existing.CompletionPercentage = profile.CompletionPercentage;
            existing.PhotoUrl = GetPublicPhotoUrl(profile);
            existing.LastActiveAt = profile.LastActiveAt;
            existing.UpdatedAt = profile.UpdatedAt;
        }

        await pgDb.SaveChangesAsync();
    }

    private static ProfileIndex BuildIndex(Profile profile, int? ageYears) => new()
    {
        Id = profile.Id,
        DisplayName = profile.Basic?.DisplayName,
        Gender = profile.Basic?.Gender?.ToString(),
        Religion = profile.Basic?.Religion?.ToString(),
        MaritalStatus = profile.Basic?.MaritalStatus?.ToString(),
        CountryOfResidence = profile.Basic?.CountryOfResidence,
        Division = profile.Basic?.Division,
        District = profile.Basic?.District,
        AgeYears = ageYears,
        HeightCm = profile.Physical?.HeightCm,
        EducationLevel = profile.Education?.Level?.ToString(),
        EducationLevelOrder = profile.Education?.Level.HasValue == true
            ? (int)profile.Education.Level.Value : (int?)null,
        EmploymentType = profile.Career?.EmploymentType?.ToString(),
        Status = profile.Status.ToString(),
        ProfileVisible = profile.Visibility.ProfileVisible,
        CompletionPercentage = profile.CompletionPercentage,
        PhotoUrl = GetPublicPhotoUrl(profile),
        LastActiveAt = profile.LastActiveAt,
        UpdatedAt = profile.UpdatedAt,
    };

    private static string? GetPublicPhotoUrl(Profile profile)
    {
        var photo = profile.Photos.FirstOrDefault();
        return photo?.Status == PhotoStatus.Approved && photo?.Visibility == PhotoVisibility.Public
            ? photo.Url : null;
    }

    private static int ComputeAge(DateTime dob)
    {
        var today = DateTime.UtcNow;
        var age = today.Year - dob.Year;
        if (dob.Date > today.AddYears(-age)) age--;
        return age;
    }

    private static ProfileResponse ToResponse(Profile p) => new()
    {
        Id = p.Id,
        Status = p.Status,
        Visibility = p.Visibility,
        CompletionPercentage = p.CompletionPercentage,
        AgeYears = p.Basic?.DateOfBirth.HasValue == true ? ComputeAge(p.Basic.DateOfBirth.Value) : null,
        Basic = p.Basic,
        Physical = p.Physical,
        Education = p.Education,
        Career = p.Career,
        Family = p.Family,
        Religion = p.Religion,
        Lifestyle = p.Lifestyle,
        PartnerExpectations = p.PartnerExpectations,
        Photos = p.Photos,
        Contact = p.Contact,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        LastActiveAt = p.LastActiveAt,
    };
}
