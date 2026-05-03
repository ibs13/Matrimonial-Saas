# Profile Data Model

## Two-Layer Storage

Every profile has two representations that are kept in sync:

| Layer | Database | Content | Used For |
|-------|----------|---------|---------|
| Full profile | MongoDB (`profiles` collection) | All 8 sections, photos, contact, visibility | Display, editing, owner view |
| Search index | PostgreSQL (`ProfileIndexes` table) | ~25 denormalized, searchable fields | Search, filtering, sorting |

When a user edits any section, the `ProfileService` writes to MongoDB first, recalculates the completion percentage, then upserts the changed fields into PostgreSQL. Both writes happen in the same request. There is no eventual consistency — the index is always updated synchronously.

---

## Profile Sections

A profile is built incrementally across 8 named sections. Each section maps to one API endpoint and one sub-document in MongoDB.

### 1. Basic Info (`PATCH /api/profile/basic`)

The starting point. Required fields to make the profile searchable.

| Field | Type | Visibility |
|-------|------|-----------|
| DisplayName | string | Public |
| FullName | string | Hidden (requires visibility toggle) |
| Gender | enum | Public |
| DateOfBirth | date | Public (shows age in years, not DOB) |
| Religion | enum | Public |
| MaritalStatus | enum | Public |
| Nationality | string | Public (default "Bangladeshi") |
| MotherTongue | string | Public |
| CountryOfResidence | string | Public |
| Division | string | Public |
| District | string | Public |
| AboutMe | text | Public |

### 2. Physical Info (`PATCH /api/profile/physical`)

| Field | Type | Notes |
|-------|------|-------|
| HeightCm | int | Stored in cm, displayed as ft/in or cm |
| WeightKg | int | Stored in kg |
| BodyType | enum | Slim, Average, Athletic, Heavy |
| Complexion | enum | VeryFair, Fair, Wheatish, Dark |
| BloodGroup | string | ABO + Rh (A+, O-, etc.) |
| HasPhysicalDisability | bool | |
| PhysicalDisabilityDetails | string | Only if HasPhysicalDisability = true |

### 3. Education (`PATCH /api/profile/education`)

| Field | Type |
|-------|------|
| Level | enum (BelowSSC → PostDoc, ordered) |
| FieldOfStudy | string |
| Institution | string |
| GraduationYear | int |
| AdditionalQualifications | string |

`EducationLevelOrder` is a numeric mapping of the enum stored in PostgreSQL to support `MinEducationLevel` filtering in search:

```
BelowSSC = 0, SSC = 1, HSC = 2, Bachelor = 3, Master = 4, PostDoc = 5
```

### 4. Career (`PATCH /api/profile/career`)

| Field | Type |
|-------|------|
| EmploymentType | enum (Employed, SelfEmployed, Student, Unemployed, Retired) |
| Occupation | string |
| Organization | string |
| AnnualIncome | decimal |
| IncomeCurrency | ISO 4217 string (default "BDT") |

### 5. Family (`PATCH /api/profile/family`)

| Field | Type |
|-------|------|
| FatherOccupation | string |
| MotherOccupation | string |
| NumberOfBrothers | int |
| NumberOfSisters | int |
| FamilyStatus | enum (MiddleClass, UpperMiddleClass, Rich) |
| FamilyType | enum (Nuclear, Joint) |
| FamilyCountry / Division / District | string |
| AboutFamily | text |

### 6. Religion (`PATCH /api/profile/religion`)

| Field | Type | Notes |
|-------|------|-------|
| Sect | enum (Sunni, Shia, Other) | |
| PrayerHabit | enum (Regular, Sometimes, Rarely, Never) | |
| WearsHijab | bool | Female profiles |
| WearsBeard | bool | Male profiles |
| Mazhab | string | |

### 7. Lifestyle (`PATCH /api/profile/lifestyle`)

| Field | Type |
|-------|------|
| Diet | enum (Vegetarian, NonVegetarian) |
| Smoking | enum (Never, Occasionally, Regular) |
| Hobbies | string[] |

### 8. Partner Expectations (`PATCH /api/profile/partner-expectations`)

These fields drive the match-scoring algorithm.

| Field | Type |
|-------|------|
| AgeMin / AgeMax | int |
| HeightMinCm / HeightMaxCm | int |
| MinEducationLevel | enum |
| AcceptedMaritalStatuses | enum[] |
| AcceptedReligions | enum[] |
| PreferredCountries | string[] |
| MinFamilyStatus | enum |
| AdditionalExpectations | text |

---

## Profile Completion Percentage

Completion is recalculated on every section save. Each section has a weight:

| Section | Weight |
|---------|--------|
| Basic | 20% |
| Physical | 15% |
| Education | 15% |
| Career | 15% |
| Family | 10% |
| Religion | 10% |
| Lifestyle | 10% |
| Partner Expectations | 5% |

Within each section, completion is the proportion of populated required fields. A section with no fields filled contributes 0 to the total. The result is stored in MongoDB (`CompletionPercentage`) and synced to PostgreSQL (`ProfileIndexes.CompletionPercentage`).

---

## Profile Status Lifecycle

```
POST /api/profile (create)
      │
      ▼
   [Draft]  ──── PATCH /api/profile/* (edit sections) ────►  [Draft]
      │
      │  POST /api/profile/submit
      ▼
[PendingReview]  (awaiting admin)
      │                │
      │  approve       │  reject (reason given)
      ▼                ▼
   [Active]         [Draft]  (user edits and resubmits)
      │
      │  admin suspend
      ▼
  [Suspended]  (admin can restore)
      │
      │  user deactivates
      ▼
[Deactivated]
```

Only `Active` profiles with `ProfileVisible = true` appear in search results.

---

## Photos

Photos are stored as sub-documents in the MongoDB profile and go through a moderation workflow:

```
POST /api/profile/photo (upload file, max 6MB)
      │
      ├─ Store: file on disk (dev) or cloud storage (prod)
      ├─ Add: { Url, Visibility: Public, Status: Pending, UploadedAt } to Photos[]
      └─ Clear: ProfileIndex.PhotoUrl (not shown until approved)

Admin approves photo:
      ├─ Set: photo.Status = Approved
      └─ Set: ProfileIndex.PhotoUrl = photo.Url (now visible in search)

Admin rejects photo:
      └─ Set: photo.Status = Rejected (file stays, but PhotoUrl not set)
```

Only one photo is supported per profile in v1. The first approved photo's URL is denormalized to the search index.

---

## Visibility Settings

Users can independently control what is revealed about them:

| Setting | Default | Effect when true |
|---------|---------|-----------------|
| `ShowFullName` | false | Full name visible on profile view |
| `ShowPhone` | false | Phone visible to connections |
| `ShowAddress` | false | Present address visible to connections |
| `ProfileVisible` | true | Profile appears in search results |

These flags live in the MongoDB document. `ProfileVisible` is also synced to `ProfileIndexes.ProfileVisible` since search queries filter on it.

---

## Verification Badges

Badges appear on the profile card in search results and the full profile view:

| Badge | PostgreSQL column | How earned |
|-------|------------------|------------|
| Email Verified | `IsEmailVerified` | Complete email verification flow |
| Phone Added | `HasPhone` | Add phone to contact section |
| Identity Verified | `IsIdentityVerified` | Admin manually verifies via `/api/admin/profiles/{id}/verify-identity` |
| Premium Member | `IsPremiumMember` | Active non-Free membership |

All four are stored in `ProfileIndexes` for display in search results without a MongoDB round-trip.

---

## Contact Information

Contact fields (`Phone`, `GuardianPhone`, `PresentAddress`) are stored only in MongoDB, never in PostgreSQL. They are returned only when:

1. The viewing user has an accepted interest request with the profile owner, **and**
2. The viewing user has performed a `ContactUnlock` (premium feature)

The `GET /api/profile/{userId}/contact` endpoint returns a `ContactStatusResponse` that indicates whether the contact is already unlocked, whether it can be unlocked, and if unlocked, the actual values.
