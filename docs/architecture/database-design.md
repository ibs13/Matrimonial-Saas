# Database Design

## Overview

The application uses two databases with distinct responsibilities:

| Database | Role | Why |
|----------|------|-----|
| PostgreSQL 16 | Relational data, search index, transactions | ACID guarantees, foreign keys, composite indexes for filtered search |
| MongoDB 7 | Full profile documents | Flexible nested schema, no migrations needed for profile structure changes |

---

## PostgreSQL Schema (22 Tables)

### Authentication

**Users**
```
Id            uuid        PRIMARY KEY (default gen_random_uuid())
Email         varchar     UNIQUE NOT NULL
PasswordHash  varchar     NOT NULL (BCrypt)
Role          varchar     NOT NULL ('User' | 'Admin')
IsActive      bool        NOT NULL DEFAULT true
IsEmailVerified bool      NOT NULL DEFAULT false
CreatedAt     timestamptz NOT NULL DEFAULT now()
```

**RefreshTokens**
```
Id        uuid        PRIMARY KEY
Token     varchar     UNIQUE NOT NULL (random bytes, SHA256 hashed on lookup)
ExpiresAt timestamptz NOT NULL
IsRevoked bool        NOT NULL DEFAULT false
UserId    uuid        FK → Users(Id) ON DELETE CASCADE
```

**EmailVerificationTokens**
```
Id        uuid        PRIMARY KEY
UserId    uuid        FK → Users(Id) ON DELETE CASCADE
TokenHash varchar     UNIQUE NOT NULL (SHA256 of raw token)
UsedAt    timestamptz NULLABLE
ExpiresAt timestamptz NOT NULL
```

---

### Profile Search Index

**ProfileIndexes** (denormalized from MongoDB)
```
Id                   uuid    PRIMARY KEY = Users.Id
Status               varchar ('Draft'|'Active'|'Suspended'|'Deactivated')
ProfileVisible       bool
Gender               varchar
Religion             varchar
MaritalStatus        varchar
CountryOfResidence   varchar
Division             varchar
District             varchar
AgeYears             int
HeightCm             int NULLABLE
EducationLevel       varchar
EducationLevelOrder  int     (numeric sort: BelowSSC=0 … PostDoc=5)
EmploymentType       varchar
CompletionPercentage int
LastActiveAt         timestamptz NULLABLE
UpdatedAt            timestamptz
PhotoUrl             varchar NULLABLE
DisplayName          varchar
IsEmailVerified      bool
HasPhone             bool
IsIdentityVerified   bool
IsPremiumMember      bool
```

**Search indexes on ProfileIndexes:**
- `(Status, ProfileVisible, Gender, Religion)` — core search filter
- `(CountryOfResidence, Division, District)` — location drill-down
- `AgeYears` — age range filter
- `HeightCm` — height range filter
- `EducationLevelOrder` — min education filter
- `LastActiveAt` — sort by recently active
- `UpdatedAt` — sort by newest

The search index is updated on every profile write. It never holds PII (no phone, no full name, no address).

---

### Social Interactions

**InterestRequests**
```
Id           uuid PRIMARY KEY
SenderId     uuid FK → Users(Id) ON DELETE RESTRICT
ReceiverId   uuid FK → Users(Id) ON DELETE RESTRICT
Status       varchar ('Pending'|'Accepted'|'Rejected')
Message      varchar NULLABLE
SentAt       timestamptz
RespondedAt  timestamptz NULLABLE
```
Indexes: `(SenderId, ReceiverId)`, `(SenderId, Status, SentAt)`, `(ReceiverId, Status, SentAt)`

RESTRICT on delete preserves request history when a user deactivates their account.

**SavedProfiles**
```
Id          uuid PRIMARY KEY
UserId      uuid FK → Users(Id)
SavedUserId uuid FK → Users(Id)
SavedAt     timestamptz
UNIQUE (UserId, SavedUserId)
```

**ProfileViews**
```
Id            uuid PRIMARY KEY
ViewerUserId  uuid FK → Users(Id)
ViewedUserId  uuid FK → Users(Id)
ViewedAt      timestamptz
```
Index: `(ViewerUserId, ViewedUserId, ViewedAt)`, `(ViewedUserId, ViewedAt)`

**UserBlocks**
```
Id        uuid PRIMARY KEY
BlockerId uuid FK → Users(Id)
BlockedId uuid FK → Users(Id)
CreatedAt timestamptz
UNIQUE (BlockerId, BlockedId)
```

---

### Membership and Billing

**UserMemberships**
```
UserId    uuid PRIMARY KEY FK → Users(Id)
Plan      varchar ('Free'|'Silver'|'Gold'|'Platinum')
StartedAt timestamptz
ExpiresAt timestamptz NULLABLE
UpdatedAt timestamptz
```
One row per user. Updated in-place when plan changes.

**Orders**
```
Id          uuid PRIMARY KEY
UserId      uuid FK → Users(Id)
Plan        varchar
AmountBdt   numeric(10,2)
Status      varchar ('Pending'|'Completed'|'Failed'|'Cancelled')
DurationDays int
Notes       varchar NULLABLE
CreatedAt   timestamptz
PaidAt      timestamptz NULLABLE
```

**PaymentAttempts**
```
Id                   uuid PRIMARY KEY
OrderId              uuid FK → Orders(Id)
UserId               uuid (denormalized for per-user queries)
AmountBdt            numeric(10,2)
Status               varchar ('Pending'|'Success'|'Failed')
GatewayName          varchar NULLABLE
GatewayTransactionId varchar NULLABLE UNIQUE
FailureReason        varchar NULLABLE
AttemptedAt          timestamptz
CompletedAt          timestamptz NULLABLE
```
`GatewayTransactionId` has a unique constraint to prevent double-processing.

**ContactUnlocks**
```
Id               uuid PRIMARY KEY
UnlockedByUserId uuid FK → Users(Id)
ProfileUserId    uuid FK → Users(Id)
UnlockedAt       timestamptz
UNIQUE (UnlockedByUserId, ProfileUserId)
```

---

### Support and Notifications

**Notifications**
```
Id        uuid PRIMARY KEY
UserId    uuid FK → Users(Id)
Type      varchar
Title     varchar
Body      text
IsRead    bool DEFAULT false
CreatedAt timestamptz
```
Indexes: `(UserId, CreatedAt)`, `(UserId, IsRead)` — the second supports fast unread counts.

**SupportTickets**
```
Id        uuid PRIMARY KEY
UserId    uuid FK → Users(Id)
Category  varchar
Status    varchar ('Open'|'InProgress'|'Resolved'|'Closed')
Subject   varchar
CreatedAt timestamptz
UpdatedAt timestamptz
```

**SupportTicketMessages**
```
Id           uuid PRIMARY KEY
TicketId     uuid FK → SupportTickets(Id)
SenderUserId uuid
Body         text
CreatedAt    timestamptz
```

---

### Matching and Chat

**ProfileMatches**
```
Id            uuid PRIMARY KEY
UserId        uuid FK → Users(Id)
CandidateId   uuid
Score         int (0–100)
MatchLevel    varchar ('Poor'|'Fair'|'Good'|'Excellent')
MatchReasons  text (JSON array serialized as string)
AiExplanation text NULLABLE
ScoredAt      timestamptz
UNIQUE (UserId, CandidateId)
```

**Conversations**
```
Id            uuid PRIMARY KEY
User1Id       uuid FK → Users(Id)  -- always the lower UUID
User2Id       uuid FK → Users(Id)  -- always the higher UUID
LastMessageAt timestamptz NULLABLE
IsClosed      bool DEFAULT false
ClosedAt      timestamptz NULLABLE
CreatedAt     timestamptz
UNIQUE (User1Id, User2Id)
```

The User1Id < User2Id ordering guarantees there is never a duplicate conversation for the same pair.

**Messages**
```
Id             uuid PRIMARY KEY
ConversationId uuid FK → Conversations(Id) ON DELETE CASCADE
SenderId       uuid FK → Users(Id)
Body           varchar(1000)
CreatedAt      timestamptz
```

**MessageReads**
```
Id       uuid PRIMARY KEY
MessageId uuid FK → Messages(Id) ON DELETE CASCADE
ReaderId  uuid FK → Users(Id)
ReadAt    timestamptz
UNIQUE (MessageId, ReaderId)
```

**MessageReports**
```
Id                  uuid PRIMARY KEY
MessageId           uuid FK → Messages(Id) ON DELETE CASCADE
ReporterId          uuid FK → Users(Id) ON DELETE RESTRICT
Reason              varchar(300)
Status              varchar ('Open'|'Dismissed')
CreatedAt           timestamptz
ReviewedByAdminId   uuid NULLABLE
ReviewedAt          timestamptz NULLABLE
UNIQUE (MessageId, ReporterId)
```

---

### Moderation and Audit

**ProfileReports**
```
Id             uuid PRIMARY KEY
ReporterId     uuid FK → Users(Id)
ReportedUserId uuid FK → Users(Id)
Reason         varchar
Status         varchar
Description    varchar NULLABLE
CreatedAt      timestamptz
```

**AuditLogs**
```
Id          uuid PRIMARY KEY
AdminId     uuid
AdminEmail  varchar
Action      varchar(64)
EntityType  varchar(32)
EntityId    uuid
Reason      varchar NULLABLE
CreatedAt   timestamptz
```

AuditLogs has no FK to Users so the record survives if the admin account is deleted.

---

## MongoDB Schema (1 Collection)

**Collection:** `profiles`

Each document's `_id` is the same GUID as the corresponding `Users.Id` row in PostgreSQL, allowing O(1) lookups by user ID.

```json
{
  "_id": "uuid",
  "Status": "Draft | Active | Suspended | Deactivated",
  "Visibility": {
    "ShowFullName": false,
    "ShowPhone": false,
    "ShowAddress": false,
    "ProfileVisible": true
  },
  "CompletionPercentage": 0,
  "Basic": {
    "DisplayName": "string",
    "FullName": "string (hidden)",
    "Gender": "Male | Female",
    "DateOfBirth": "ISO date",
    "Religion": "Islam | Hinduism | Buddhism | Christianity | Other",
    "MaritalStatus": "NeverMarried | Divorced | Widowed | Separated",
    "Nationality": "Bangladeshi",
    "MotherTongue": "Bengali",
    "CountryOfResidence": "string",
    "Division": "string",
    "District": "string",
    "AboutMe": "text"
  },
  "Physical": {
    "HeightCm": 170,
    "WeightKg": 65,
    "BodyType": "Slim | Average | Athletic | Heavy",
    "Complexion": "VeryFair | Fair | Wheatish | Dark",
    "BloodGroup": "A+ | O- | ...",
    "HasPhysicalDisability": false,
    "PhysicalDisabilityDetails": null
  },
  "Education": {
    "Level": "BelowSSC | SSC | HSC | Bachelor | Master | PostDoc",
    "FieldOfStudy": "string",
    "Institution": "string",
    "GraduationYear": 2018,
    "AdditionalQualifications": "string"
  },
  "Career": {
    "EmploymentType": "Employed | SelfEmployed | Student | Unemployed | Retired",
    "Occupation": "string",
    "Organization": "string",
    "AnnualIncome": 500000,
    "IncomeCurrency": "BDT"
  },
  "Family": {
    "FatherOccupation": "string",
    "MotherOccupation": "string",
    "NumberOfBrothers": 2,
    "NumberOfSisters": 1,
    "FamilyStatus": "MiddleClass | UpperMiddleClass | Rich",
    "FamilyType": "Nuclear | Joint",
    "FamilyCountry": "string",
    "FamilyDivision": "string",
    "FamilyDistrict": "string",
    "AboutFamily": "text"
  },
  "Religion": {
    "Sect": "Sunni | Shia | Other",
    "PrayerHabit": "Regular | Sometimes | Rarely | Never",
    "WearsHijab": false,
    "WearsBeard": true,
    "Mazhab": "string"
  },
  "Lifestyle": {
    "Diet": "Vegetarian | NonVegetarian",
    "Smoking": "Never | Occasionally | Regular",
    "Hobbies": ["reading", "travelling"]
  },
  "PartnerExpectations": {
    "AgeMin": 22,
    "AgeMax": 30,
    "HeightMinCm": 155,
    "HeightMaxCm": 180,
    "MinEducationLevel": "Bachelor",
    "AcceptedMaritalStatuses": ["NeverMarried"],
    "AcceptedReligions": ["Islam"],
    "PreferredCountries": ["Bangladesh"],
    "MinFamilyStatus": "MiddleClass",
    "AdditionalExpectations": "text"
  },
  "Photos": [
    {
      "Url": "/photos/uuid.jpg",
      "Visibility": "Public | Private",
      "Status": "Pending | Approved | Rejected",
      "UploadedAt": "ISO date"
    }
  ],
  "Contact": {
    "Phone": "01711000000 (hidden)",
    "GuardianPhone": "01722000000 (hidden, female profiles)",
    "PresentAddress": "string (hidden)",
    "PermanentAddress": "string"
  },
  "CreatedAt": "ISO date",
  "UpdatedAt": "ISO date",
  "LastActiveAt": "ISO date"
}
```

---

## Migrations

EF Core migrations live in `apps/api/src/MatrimonialApi/Data/Migrations/`. They are applied automatically on API startup in the Development environment.

**In production**, apply manually:
```bash
dotnet ef database update --project src/MatrimonialApi --connection "$POSTGRES_CONNECTION_STRING"
```

**Migration history** (in chronological order):

| Migration | What Changed |
|-----------|-------------|
| `20260430154936_InitialAuth` | Users, RefreshTokens |
| `20260430164614_AddProfileIndex` | ProfileIndexes with core search columns |
| `20260430165521_AddProfileIndexSearchColumns` | Additional search filter columns |
| `20260430170310_AddInterestRequests` | InterestRequests |
| `20260501195748_InitialSchema` | FK behavior fixes |
| `20260501203736_AddSavedProfiles` | SavedProfiles |
| `20260501204641_AddProfileReports` | ProfileReports |
| `20260501205517_AddEmailVerification` | EmailVerificationTokens |
| `20260501233211_AddProfileIndexPhotoUrl` | PhotoUrl on ProfileIndex |
| `20260502084701_AddNotifications` | Notifications |
| `20260502090137_AddProfileViews` | ProfileViews |
| `20260502093522_AddMembership` | UserMemberships |
| `20260502125622_AddPaymentTables` | Orders, PaymentAttempts |
| `20260502131017_AddContactUnlocks` | ContactUnlocks |
| `20260502132226_AddPaymentVerification` | Payment verification columns |
| `20260503021521_AddVerificationBadgesToProfileIndex` | IsEmailVerified, HasPhone, IsIdentityVerified, IsPremiumMember on ProfileIndex |
| `20260503022258_AddSupportTickets` | SupportTickets, SupportTicketMessages |
| `20260503024322_AddProfileMatches` | ProfileMatches |
| `20260503030000_AddAiExplanationToProfileMatch` | AiExplanation column |
| `20260503050000_AddChatTables` | Conversations, Messages, MessageReads, UserBlocks |
| `20260503060000_AddChatModeration` | IsClosed/ClosedAt on Conversations, MessageReports |
