# Profile Management

## Overview

Profile management covers everything a user does with their own profile: creating it, filling sections, uploading a photo, submitting for review, and updating settings. The profile is the central entity of the platform — it determines who can find a user in search and drives the match-scoring algorithm.

---

## Profile Lifecycle

```
Account created → Profile does not exist yet
       │
       │  POST /api/profile
       ▼
   [Draft] — empty profile, not visible in search
       │
       │  PATCH /api/profile/{section} (fill sections incrementally)
       │  POST /api/profile/photo (upload photo)
       │
       │  POST /api/profile/submit
       ▼
[PendingReview] — awaiting admin approval
       │
   ┌───┴──────────────┐
   │ Approved          │ Rejected (with reason)
   ▼                   ▼
[Active]            [Draft] — user edits and resubmits
   │
   │  User or admin action
   ▼
[Suspended] — not visible, no new interactions
```

---

## Creating a Profile

A new account does not automatically have a profile. The user must create one:

```
POST /api/profile
```

This creates an empty profile document in MongoDB with `Status = Draft` and 0% completion. It also creates a corresponding row in `ProfileIndexes` (PostgreSQL) to track the profile in the search index.

If a profile already exists for the user, this endpoint returns the existing profile without creating a duplicate.

---

## Editing Sections

Each section has its own endpoint. Users can save sections in any order and return to update them later.

| Section | Endpoint | Key Fields |
|---------|----------|-----------|
| Basic | `PATCH /api/profile/basic` | Display name, gender, DOB, religion, location |
| Physical | `PATCH /api/profile/physical` | Height, weight, body type, complexion |
| Education | `PATCH /api/profile/education` | Level, field, institution, graduation year |
| Career | `PATCH /api/profile/career` | Employment type, occupation, income |
| Family | `PATCH /api/profile/family` | Parents, siblings, family type/status |
| Religion | `PATCH /api/profile/religion` | Sect, prayer habit, hijab/beard |
| Lifestyle | `PATCH /api/profile/lifestyle` | Diet, smoking, hobbies |
| Partner Expectations | `PATCH /api/profile/partner-expectations` | Desired age, location, education, religion |
| Contact | `PATCH /api/profile/contact` | Phone, address (hidden from others) |

All endpoints return the complete updated `ProfileResponse` so the frontend can refresh the completion meter and section status indicators.

**Partner expectations are required for match scoring.** Without them, the matches page returns an empty list with `hasPreferences: false`.

---

## Completion Percentage

After every section save, the `ProfileService` recalculates the completion percentage based on filled fields:

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

The percentage is stored in both MongoDB (as `CompletionPercentage`) and PostgreSQL (`ProfileIndexes.CompletionPercentage`) for sorting search results by completion.

---

## Submitting for Review

```
POST /api/profile/submit
```

Changes `Status` from `Draft` to `PendingReview`. An admin must then approve or reject the profile.

- **Approved** → `Status = Active`, profile appears in search
- **Rejected** → `Status = Draft` with a reason, user edits and resubmits

There is no minimum completion percentage required to submit, but profiles with low completion are less likely to get interest requests.

---

## Editing After Approval

Active profiles can still be edited. Section updates go directly to MongoDB and PostgreSQL without requiring re-submission. Status remains `Active`.

If a user wants to hide their profile temporarily without deactivating:
```
PATCH /api/profile/visibility
{ "profileVisible": false }
```
This sets `ProfileIndexes.ProfileVisible = false`, removing the profile from all search results instantly.

---

## Visibility Settings

```
PATCH /api/profile/visibility
{
  "showFullName": false,
  "showPhone": false,
  "showAddress": false,
  "profileVisible": true
}
```

Each flag is independent. The defaults are conservative (everything hidden). Users must explicitly turn on visibility for PII.

- `profileVisible = false` — hides the profile from search while keeping it active
- `showFullName = true` — full name shown when other users view the profile
- `showPhone = true` — phone shown to users with an accepted interest (still requires ContactUnlock for premium)
- `showAddress = true` — same as phone

---

## Photo Upload

```
POST /api/profile/photo
Content-Type: multipart/form-data
Body: file (JPEG or PNG, max 6MB)
```

- File is saved to disk (dev) or cloud storage (prod)
- A `ProfilePhoto` sub-document is added to the MongoDB profile: `{ Url, Visibility: Public, Status: Pending }`
- `ProfileIndexes.PhotoUrl` remains null until an admin approves the photo
- If a previous approved photo exists, it remains the active search photo until the new one is approved

Only one photo per profile in v1. Uploading a new photo replaces the previous one in the MongoDB document (the old file remains on disk and must be cleaned up manually in dev).

### Photo Visibility

```
PATCH /api/profile/photo/visibility
{ "visibility": "Public" }
```

Options: `Public` (any authenticated user), `Private` (owner only). This is independent of admin approval status.

### Deleting a Photo

```
DELETE /api/profile/photo
```

Removes the photo sub-document from MongoDB and clears `ProfileIndexes.PhotoUrl`.

---

## Profile View (Reading Another User's Profile)

When a user opens another profile:

1. `GET /api/profile/{userId}` — loads the profile (respects visibility flags)
2. `POST /api/profile/{userId}/view` — records the profile view (deduplicated per day)
3. The profile owner sees this in their "Viewers" list

What is shown depends on visibility settings and the relationship between the viewer and profile owner:

| Field | Shown when |
|-------|-----------|
| Display name | Always |
| Age (not DOB) | Always |
| Gender, religion, location | Always |
| Full name | Owner set `showFullName = true` |
| Photo (Public) | Admin approved + `Visibility = Public` |
| Education, career details | Always |
| Contact info | Accepted interest + `showPhone/showAddress = true` + ContactUnlock |

---

## Contact Unlock (Premium)

After an interest request is accepted, premium users can reveal the other person's contact info:

1. `GET /api/profile/{userId}/contact`
   - Returns unlock status: `{ isUnlocked: false, canUnlock: true }`
   - If not premium: `{ isUnlocked: false, canUnlock: false, blockReason: "PremiumRequired" }`
2. `POST /api/profile/{userId}/unlock-contact`
   - Creates `ContactUnlocks` record
   - Returns actual contact fields
3. Subsequent visits: `{ isUnlocked: true, phone, guardianPhone, presentAddress, permanentAddress }`

Unlocks are permanent — no expiry, no way to re-lock.

---

## Profile Response Shape

All profile-modifying endpoints return a `ProfileResponse`:

```typescript
interface ProfileResponse {
  id: string;
  status: ProfileStatus;
  completionPercentage: number;
  visibility: ProfileVisibility;
  badges: VerificationBadges;
  basic: BasicInfo | null;
  physical: PhysicalInfo | null;
  education: EducationInfo | null;
  career: CareerInfo | null;
  family: FamilyInfo | null;
  religion: ReligionInfo | null;
  lifestyle: LifestyleInfo | null;
  partnerExpectations: PartnerExpectations | null;
  photos: ProfilePhoto[];
  contact: ContactInfo | null;
  createdAt: string;
  updatedAt: string;
}
```
