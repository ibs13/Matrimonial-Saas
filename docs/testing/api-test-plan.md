# API Test Plan — Matrimonial SaaS v1

**Base URL:** `{{baseUrl}}` (default: `http://localhost:5000`)  
**Content-Type:** `application/json` (all request bodies)  
**Auth header:** `Authorization: Bearer {{accessToken}}`  
**Last Updated:** 2026-05-03

---

## Postman Setup

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API root URL | `http://localhost:5000` |
| `accessToken` | Current user JWT access token | *(set by login script)* |
| `refreshToken` | Current user refresh token | *(set by login script)* |
| `adminAccessToken` | Admin JWT access token | *(set by admin login script)* |
| `userId` | Current user's UUID | *(set by login script)* |
| `otherUserId` | Second test user UUID | *(set manually or by script)* |
| `interestId` | UUID of a created interest request | *(set by send-interest script)* |
| `savedId` | UUID of a saved-profile record | *(set by save-profile script)* |
| `reportId` | UUID of a profile report | *(set by submit-report script)* |
| `orderId` | UUID of a created order | *(set by create-order script)* |
| `paymentAttemptId` | UUID of a payment attempt | *(set by submit-payment script)* |
| `ticketId` | UUID of a support ticket | *(set by create-ticket script)* |
| `conversationUserId` | UUID of chat partner | *(set manually)* |
| `messageId` | UUID of a chat message | *(set by send-message script)* |
| `messageReportId` | UUID of a chat message report | *(set by report-message script)* |
| `convId` | UUID of a conversation | *(set by get-thread script)* |

### Collection-Level Pre-request Script (Auto Token Refresh)

Paste in **Collection → Pre-request Script** to keep `accessToken` fresh:

```javascript
const expiresAt = pm.environment.get("accessTokenExpiresAt");
if (!expiresAt) return;

const isExpired = new Date(expiresAt) < new Date(Date.now() + 30_000);
if (!isExpired) return;

const baseUrl = pm.environment.get("baseUrl");
const refreshToken = pm.environment.get("refreshToken");
if (!refreshToken) return;

pm.sendRequest({
    url: `${baseUrl}/api/auth/refresh`,
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: { mode: "raw", raw: JSON.stringify({ refreshToken }) }
}, (err, res) => {
    if (err || res.code !== 200) return;
    const body = res.json();
    pm.environment.set("accessToken", body.accessToken);
    pm.environment.set("refreshToken", body.refreshToken);
    pm.environment.set("accessTokenExpiresAt", body.accessTokenExpiresAt);
});
```

### Common Test Script Snippets

```javascript
// Assert status code
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.test("Status 204", () => pm.response.to.have.status(204));
pm.test("Status 400", () => pm.response.to.have.status(400));
pm.test("Status 401", () => pm.response.to.have.status(401));
pm.test("Status 403", () => pm.response.to.have.status(403));
pm.test("Status 409", () => pm.response.to.have.status(409));
pm.test("Status 429", () => pm.response.to.have.status(429));

// Assert field exists in body
pm.test("Has accessToken", () => {
    const body = pm.response.json();
    pm.expect(body).to.have.property("accessToken");
});

// Save variable from response
const body = pm.response.json();
pm.environment.set("accessToken", body.accessToken);
pm.environment.set("refreshToken", body.refreshToken);
pm.environment.set("accessTokenExpiresAt", body.accessTokenExpiresAt);
pm.environment.set("userId", body.id); // from /me
```

---

## 1. Authentication & Registration

### `POST /api/auth/register`

**Auth:** None  
**Rate limit:** 10 req/min per IP (returns 429 when exceeded)

**Request body:**
```json
{
  "email": "testuser@example.com",
  "password": "SecurePass1!"
}
```

**Success — `201 Created`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a1b2c3...",
  "accessTokenExpiresAt": "2026-05-03T11:00:00Z",
  "role": "User",
  "isEmailVerified": false
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing fields, email format invalid, password < 8 chars |
| `409` | Email already registered |
| `429` | Rate limit exceeded |

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.test("Has tokens", () => {
    const b = pm.response.json();
    pm.expect(b.accessToken).to.be.a("string").and.not.empty;
    pm.expect(b.refreshToken).to.be.a("string").and.not.empty;
    pm.expect(b.isEmailVerified).to.equal(false);
    pm.environment.set("accessToken", b.accessToken);
    pm.environment.set("refreshToken", b.refreshToken);
    pm.environment.set("accessTokenExpiresAt", b.accessTokenExpiresAt);
});
```

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid email + 8-char password | 201 + tokens |
| Duplicate email | Same email as existing user | 409 |
| Short password | `"pass"` (4 chars) | 400 |
| Invalid email | `"notanemail"` | 400 |
| Missing password | Omit field entirely | 400 |

---

### `POST /api/auth/login`

**Auth:** None  
**Rate limit:** 10 req/min per IP

**Request body:**
```json
{
  "email": "testuser@example.com",
  "password": "SecurePass1!"
}
```

**Success — `200 OK`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a1b2c3...",
  "accessTokenExpiresAt": "2026-05-03T11:00:00Z",
  "role": "User",
  "isEmailVerified": true
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing / malformed fields |
| `401` | Wrong password or non-existent email |
| `429` | Rate limit exceeded |

**Postman test script:**
```javascript
pm.test("Status 200", () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.environment.set("accessToken", b.accessToken);
pm.environment.set("refreshToken", b.refreshToken);
pm.environment.set("accessTokenExpiresAt", b.accessTokenExpiresAt);
```

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Correct credentials | 200 + tokens |
| Wrong password | Valid email, wrong password | 401 |
| Unknown email | Non-existent email | 401 (no info leakage) |
| Empty body | `{}` | 400 |

---

### `POST /api/auth/refresh`

**Auth:** None (uses refresh token in body)

**Request body:**
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Success — `200 OK`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "new-token...",
  "accessTokenExpiresAt": "2026-05-03T12:00:00Z",
  "role": "User",
  "isEmailVerified": true
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing refreshToken field |
| `401` | Token expired, revoked, or not found |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid unexpired refreshToken | 200 + new tokens; old refresh token invalidated |
| Expired token | Use token from a logged-out session | 401 |
| Tampered token | Modify one character | 401 |
| Missing field | `{}` | 400 |

---

### `POST /api/auth/logout`

**Auth:** Bearer token (any authenticated user)

**Request body:** *(none)*

**Success — `204 No Content`**

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid access token | 204; refresh token now revoked |
| No auth header | — | 401 |
| Re-use refresh after logout | Old refreshToken | 401 |

---

### `GET /api/auth/me`

**Auth:** Bearer token

**Request body:** *(none)*

**Success — `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "testuser@example.com",
  "role": "User",
  "isEmailVerified": true
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `401` | No or invalid token |

**Postman test script:**
```javascript
pm.test("Status 200", () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.expect(b.id).to.be.a("string");
pm.expect(b.role).to.be.oneOf(["User", "Admin"]);
pm.environment.set("userId", b.id);
```

---

## 2. Email Verification

### `GET /api/auth/verify-email?token={token}`

**Auth:** None  
**Source:** Token is printed to the console by `DevEmailSender` in development.

**Success — `200 OK`:**
```json
{ "message": "Email verified successfully." }
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing token parameter |
| `400` or `404` | Invalid, expired, or already-used token |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Token from console log | 200; `isEmailVerified` = true on next `/me` call |
| Already used | Same token a second time | 400 / 409 |
| Tampered | Change one character in token | 400 / 404 |
| Missing param | `/api/auth/verify-email` (no `?token=`) | 400 |

---

### `POST /api/auth/resend-verification`

**Auth:** Bearer token (unverified user)

**Request body:** *(none)*

**Success — `204 No Content`**  
*(Console log shows new verification link in dev mode)*

**Error responses:**

| Status | Condition |
|--------|-----------|
| `401` | No auth token |
| `409` | Email already verified |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Unverified user token | 204; new token in console |
| Already verified | Verified user token | 409 |
| No auth | — | 401 |

---

## 3. Profile Management

### `POST /api/profile`

**Auth:** Bearer token (verified user)

**Request body:** *(none — creates an empty draft profile)*

**Success — `201 Created`:**
```json
{
  "message": "Profile created.",
  "completionPercentage": 0
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `401` | No auth |
| `409` | Profile already exists for this user |

---

### `GET /api/profile/me`

**Auth:** Bearer token

**Success — `200 OK`** — full MongoDB profile document including all sections.  

Key top-level fields: `id`, `userId`, `status`, `completionPercentage`, `basicInfo`, `physicalInfo`, `educationInfo`, `careerInfo`, `familyInfo`, `religionInfo`, `lifestyleInfo`, `partnerExpectations`, `contactInfo`.

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Profile exists | — | 200 + full document |
| No profile created yet | — | 404 |
| No auth | — | 401 |

---

### `PATCH /api/profile/basic`

**Auth:** Bearer token

**Request body:**
```json
{
  "displayName": "Sabrina Islam",
  "fullName": "Sabrina Islam Chowdhury",
  "gender": "Female",
  "dateOfBirth": "1998-04-15T00:00:00Z",
  "religion": "Islam",
  "maritalStatus": "NeverMarried",
  "nationality": "Bangladeshi",
  "motherTongue": "Bengali",
  "countryOfResidence": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka",
  "aboutMe": "A software engineer who loves to read."
}
```

**Enum values:**

| Field | Valid values |
|-------|-------------|
| `gender` | `Male`, `Female` |
| `religion` | `Islam`, `Hinduism`, `Christianity`, `Buddhism`, `Other` |
| `maritalStatus` | `NeverMarried`, `Divorced`, `Widowed`, `Separated` |

**Success — `200 OK`:** Updated profile document.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Validation error (e.g., `displayName` < 2 or > 60 chars, invalid enum) |
| `401` | No auth |
| `404` | Profile not yet created |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | All valid fields | 200; `completionPercentage` increases |
| Display name too long | 61-character string | 400 |
| Invalid enum | `"gender": "Unknown"` | 400 |
| Missing required field | Omit `displayName` | 400 |

---

### `PATCH /api/profile/physical`

**Auth:** Bearer token

**Request body:**
```json
{
  "heightCm": 162,
  "weightKg": 55,
  "bodyType": "Average",
  "complexion": "Fair",
  "bloodGroup": "B+",
  "hasPhysicalDisability": false
}
```

**Enum values:** `bodyType`: `Slim`, `Average`, `Athletic`, `Heavy` · `complexion`: `VeryFair`, `Fair`, `Wheatish`, `Dark`

**Success — `200 OK`**

**Error responses:** `400` (height out of 100–250 range), `401`, `404`

---

### `PATCH /api/profile/education`

**Auth:** Bearer token

**Request body:**
```json
{
  "educationLevel": "Bachelor",
  "fieldOfStudy": "Computer Science",
  "institutionName": "BUET",
  "graduationYear": 2020
}
```

**Enum values:** `educationLevel`: `BelowSSC`, `SSC`, `HSC`, `Diploma`, `Bachelor`, `Masters`, `PhD`, `PostDoc`

**Success — `200 OK`**

---

### `PATCH /api/profile/career`

**Auth:** Bearer token

**Request body:**
```json
{
  "employmentType": "Employed",
  "jobTitle": "Software Engineer",
  "company": "Tech Corp",
  "monthlyIncomeRange": "50000-100000"
}
```

**Enum values:** `employmentType`: `Employed`, `SelfEmployed`, `BusinessOwner`, `Student`, `Unemployed`

**Success — `200 OK`**

---

### `PATCH /api/profile/family`

**Auth:** Bearer token

**Request body:**
```json
{
  "fatherOccupation": "Retired",
  "motherOccupation": "Homemaker",
  "numberOfBrothers": 2,
  "numberOfSisters": 1,
  "familyType": "Nuclear",
  "familyStatus": "MiddleClass",
  "familyReligion": "Islam"
}
```

**Success — `200 OK`**

---

### `PATCH /api/profile/religion`

**Auth:** Bearer token

**Request body:**
```json
{
  "religion": "Islam",
  "islamicSect": "Sunni",
  "prayerHabit": "FiveTimes",
  "wearHijab": true
}
```

**Success — `200 OK`**

---

### `PATCH /api/profile/lifestyle`

**Auth:** Bearer token

**Request body:**
```json
{
  "diet": "HalalOnly",
  "smoking": "Never",
  "hobbies": ["reading", "cooking"],
  "languagesKnown": ["Bengali", "English"]
}
```

**Success — `200 OK`**

---

### `PATCH /api/profile/partner-expectations`

**Auth:** Bearer token

**Request body:**
```json
{
  "ageMin": 24,
  "ageMax": 32,
  "heightMinCm": 165,
  "heightMaxCm": 185,
  "minEducationLevel": "Bachelor",
  "acceptedMaritalStatuses": ["NeverMarried"],
  "acceptedReligions": ["Islam"],
  "preferredCountries": ["Bangladesh"],
  "additionalExpectations": "Must be family-oriented."
}
```

**Success — `200 OK`**

---

### `PATCH /api/profile/contact`

**Auth:** Bearer token

**Request body:**
```json
{
  "phone": "+8801711000000",
  "guardianPhone": "+8801711000001",
  "presentAddress": "Mirpur, Dhaka",
  "permanentAddress": "Sylhet"
}
```

**Success — `200 OK`**

> **Security note:** Contact fields must **not** appear in public search results or profile detail responses for other users (unless unlocked via premium contact unlock).

---

### `PATCH /api/profile/visibility`

**Auth:** Bearer token

**Request body:**
```json
{
  "showFullName": false,
  "showPhone": false,
  "showAddress": false,
  "profileVisible": true
}
```

**Success — `200 OK`**

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Hide profile | `profileVisible: false` | Profile excluded from search results |
| Show profile | `profileVisible: true` | Profile visible in search |

---

### `POST /api/profile/submit`

**Auth:** Bearer token

**Request body:** *(none)*

**Success — `200 OK`:**
```json
{ "message": "Profile submitted for review." }
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Profile incomplete (below minimum required fields) |
| `401` | No auth |
| `409` | Already submitted / not in a submittable state |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Profile with basic info filled | 200; status → `PendingReview` |
| Already pending | Call submit a second time | 409 |
| Already active | Profile already approved | 409 |

---

### `GET /api/profile/{userId}/contact`

**Auth:** Bearer token

**Success — `200 OK` (locked):**
```json
{
  "isUnlocked": false,
  "canUnlock": false,
  "blockReason": "NoPlan"
}
```

**Success — `200 OK` (unlocked — premium user):**
```json
{
  "isUnlocked": true,
  "canUnlock": true,
  "blockReason": null,
  "email": "user@example.com",
  "phone": "+8801711000000",
  "guardianPhone": "+8801711000001",
  "presentAddress": "Mirpur, Dhaka",
  "permanentAddress": "Sylhet"
}
```

**`blockReason` values:** `NoPlan` · `NoAcceptedInterest` · `OwnProfile`

**Test cases:**

| Case | User | Expected |
|------|------|----------|
| No premium | Free user | `isUnlocked: false`, `canUnlock: false`, `blockReason: "NoPlan"` |
| No accepted interest | Premium user, no interest | `blockReason: "NoAcceptedInterest"` |
| Already unlocked | Premium user, prior unlock | `isUnlocked: true` + contact fields |
| Own profile | — | `blockReason: "OwnProfile"` |

---

### `POST /api/profile/{userId}/unlock-contact`

**Auth:** Bearer token (Premium user with accepted interest)

**Request body:** *(none)*

**Success — `200 OK`:** Same shape as `ContactStatusResponse` with `isUnlocked: true` and contact fields.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `403` | No active premium membership |
| `403` | No accepted interest request with this user |
| `409` | Already unlocked (idempotent — may return 200 instead) |

---

### `POST /api/profile/{userId}/view`

**Auth:** Bearer token

**Request body:** *(none)*

**Success — `200 OK` or `204 No Content`**

> Records a profile view. Deduplication is applied (does not create a record for every page refresh in the same day).

---

### `GET /api/profile/viewers`

**Auth:** Bearer token

**Query params:** `page` (default 1), `pageSize` (default 20)

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "viewerUserId": "uuid",
      "displayName": "Ahmed Khan",
      "photoUrl": null,
      "viewedAt": "2026-05-03T08:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

## 4. Profile Photo

### `POST /api/profile/photo`

**Auth:** Bearer token  
**Content-Type:** `multipart/form-data`  
**Form field:** `photo` (file)

**Success — `200 OK`:**
```json
{
  "photoUrl": "/uploads/photos/user-uuid.jpg",
  "status": "Pending"
}
```

> Photo status starts as `Pending` — admin must approve before it becomes visible.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | No file, unsupported format, file too large (> 5 MB) |
| `401` | No auth |

**Postman notes:**  
In Postman, set body to **form-data**. Add a key `photo` with type **File** and select a JPEG/PNG.

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Valid JPEG | ≤ 5 MB JPEG | 200 + `status: "Pending"` |
| Valid PNG | ≤ 5 MB PNG | 200 |
| File too large | > 5 MB | 400 |
| Non-image | `.txt` or `.pdf` | 400 |
| No file | Empty form | 400 |

---

### `PATCH /api/profile/photo/visibility`

**Auth:** Bearer token

**Request body:**
```json
{
  "visibility": "Public"
}
```

**Enum values:** `Public`, `ApprovedUsersOnly`, `Hidden`

**Success — `200 OK` or `204 No Content`**

---

### `DELETE /api/profile/photo`

**Auth:** Bearer token

**Success — `204 No Content`**

---

### `GET /api/profile/{userId}/photo`

**Auth:** Bearer token (respects photo visibility rules)

**Success — `200 OK`:**
```json
{ "photoUrl": "/uploads/photos/uuid.jpg" }
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `200` with `null` photoUrl | No approved photo, or hidden |
| `404` | User not found |

---

## 5. Search

### `POST /api/search`

**Auth:** Bearer token

**Request body (all filters optional):**
```json
{
  "gender": "Female",
  "religion": "Islam",
  "maritalStatuses": ["NeverMarried"],
  "countryOfResidence": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka",
  "ageMin": 22,
  "ageMax": 30,
  "heightMinCm": 155,
  "heightMaxCm": 175,
  "minEducationLevel": "Bachelor",
  "employmentTypes": ["Employed", "SelfEmployed"],
  "sortBy": "LastActive",
  "page": 1,
  "pageSize": 20
}
```

**Enum values:** `sortBy`: `LastActive`, `Newest`, `Completion`

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "userId": "uuid",
      "displayName": "Sabrina Islam",
      "gender": "Female",
      "ageYears": 26,
      "religion": "Islam",
      "maritalStatus": "NeverMarried",
      "countryOfResidence": "Bangladesh",
      "division": "Dhaka",
      "district": "Dhaka",
      "educationLevel": "Bachelor",
      "employmentType": "Employed",
      "heightCm": 162,
      "completionPercentage": 85,
      "lastActiveAt": "2026-05-02T14:00:00Z",
      "photoUrl": null,
      "badges": {
        "isEmailVerified": true,
        "isIdentityVerified": false,
        "isPremiumMember": false
      }
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | `ageMin` > `ageMax`, `pageSize` > 50, invalid enum values |
| `401` | No auth |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Empty filter | `{}` | 200; own profile excluded; suspended profiles absent |
| Gender filter | `"gender": "Female"` | Only female profiles |
| Age range | `"ageMin": 25, "ageMax": 30` | Profiles aged 25–30 |
| Location | `"division": "Dhaka"` | Only Dhaka profiles |
| Pagination | `"page": 2, "pageSize": 5` | Max 5 results; correct `totalPages` |
| Suspended profile | Profile is suspended | Not returned in results |
| Hidden profile | `profileVisible: false` | Not returned |
| Invalid range | `"ageMin": 50, "ageMax": 20` | 400 |
| No auth | No header | 401 |

---

## 6. Interest Requests

### `POST /api/interests`

**Auth:** Bearer token

**Request body:**
```json
{
  "receiverId": "{{otherUserId}}",
  "message": "I came across your profile and would love to connect."
}
```

**Success — `201 Created`:**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "otherUserId": "uuid",
  "otherDisplayName": "Sabrina Islam",
  "otherGender": "Female",
  "otherAgeYears": 26,
  "otherCountryOfResidence": "Bangladesh",
  "otherDivision": "Dhaka",
  "status": "Pending",
  "message": "I came across your profile...",
  "sentAt": "2026-05-03T09:00:00Z",
  "respondedAt": null
}
```

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
const b = pm.response.json();
pm.environment.set("interestId", b.id);
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Sending to self, missing receiverId |
| `401` | No auth |
| `409` | Duplicate — interest already exists between these two users |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid `receiverId` | 201 + interest object; notification sent to receiver |
| Self interest | Own userId as receiverId | 400 |
| Duplicate | Same `receiverId` again | 409 |
| With message | Include optional message (≤ 300 chars) | 201; `message` field present |
| Exceed message | 301-char message | 400 |

---

### `GET /api/interests/sent`

**Auth:** Bearer token

**Query params:** `status` (`Pending`\|`Accepted`\|`Rejected`\|`Cancelled`), `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [ { ...InterestRequestResponse } ],
  "totalCount": 3,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `GET /api/interests/received`

**Auth:** Bearer token

**Query params:** same as `/sent`

**Success — `200 OK`:** Same shape as above.

---

### `DELETE /api/interests/{id}`

**Auth:** Bearer token (sender only)

**Success — `204 No Content`**

**Error responses:**

| Status | Condition |
|--------|-----------|
| `403` | Not the sender of this interest |
| `404` | Interest not found |
| `409` | Interest already responded to (Accepted/Rejected) |

---

### `PATCH /api/interests/{id}/accept`

**Auth:** Bearer token (receiver only)

**Request body:** *(none)*

**Success — `200 OK`:** Updated `InterestRequestResponse` with `status: "Accepted"`.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `403` | Not the receiver |
| `404` | Interest not found |
| `409` | Already accepted/rejected |

**Postman notes:** After this succeeds, the chat endpoint between sender and receiver becomes unlocked.

---

### `PATCH /api/interests/{id}/reject`

**Auth:** Bearer token (receiver only)

**Request body:** *(none)*

**Success — `200 OK`:** Updated response with `status: "Rejected"`.

**Error responses:** Same as `/accept`.

---

## 7. Saved Profiles (Shortlist)

### `POST /api/saved/{userId}`

**Auth:** Bearer token

**Request body:** *(none)*

**Success — `201 Created`:**
```json
{
  "id": "uuid",
  "savedUserId": "uuid",
  "displayName": "Sabrina Islam",
  "savedAt": "2026-05-03T09:00:00Z"
}
```

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.environment.set("savedId", pm.response.json().id);
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Saving own profile |
| `401` | No auth |
| `404` | Target user not found |
| `409` | Already saved |

---

### `GET /api/saved`

**Auth:** Bearer token

**Success — `200 OK`:**
```json
[
  {
    "id": "uuid",
    "savedUserId": "uuid",
    "displayName": "Sabrina Islam",
    "photoUrl": null,
    "savedAt": "2026-05-03T09:00:00Z"
  }
]
```

---

### `DELETE /api/saved/{id}`

**Auth:** Bearer token (must own the saved-profile record)

**Success — `204 No Content`**

**Error responses:**

| Status | Condition |
|--------|-----------|
| `403` | Record belongs to another user |
| `404` | Record not found |

---

## 8. Profile Reporting

### `POST /api/reports/{profileUserId}`

**Auth:** Bearer token

**Request body:**
```json
{
  "reason": "Fake",
  "description": "This profile uses stolen photos."
}
```

**`reason` enum values:** `Fake`, `Inappropriate`, `Scam`, `Harassment`, `Other`

**Success — `201 Created`:**
```json
{
  "id": "uuid",
  "reportedUserId": "uuid",
  "reason": "Fake",
  "description": "This profile uses stolen photos.",
  "status": "Active",
  "createdAt": "2026-05-03T09:00:00Z"
}
```

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.environment.set("reportId", pm.response.json().id);
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Reporting own profile, invalid reason enum |
| `401` | No auth |
| `404` | Reported user not found |
| `409` | Already reported this user |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid `reason` | 201 + report object |
| Self report | Own userId in path | 400 |
| Duplicate | Same target again | 409 |
| Invalid reason | `"reason": "BadWord"` | 400 |
| Optional description | Omit `description` | 201 |

---

## 9. Admin Moderation

> All admin endpoints require `Authorization: Bearer {{adminAccessToken}}`.  
> Non-admin tokens receive `403 Forbidden`.

### `GET /api/admin/metrics`

**Auth:** Admin

**Success — `200 OK`:**
```json
{
  "totalUsers": 150,
  "verifiedUsers": 120,
  "newUsersLast7Days": 12,
  "draftProfiles": 8,
  "pendingProfiles": 5,
  "approvedProfiles": 102,
  "suspendedProfiles": 3,
  "activeReports": 2,
  "pendingPhotos": 4,
  "totalInterests": 340,
  "acceptedInterests": 90,
  "recentActivity": [
    {
      "action": "ApproveProfile",
      "adminEmail": "admin@test.bd",
      "entityType": "Profile",
      "entityId": "uuid",
      "reason": null,
      "createdAt": "2026-05-03T08:00:00Z"
    }
  ]
}
```

---

### `GET /api/admin/profiles/pending`

**Auth:** Admin

**Query params:** `page` (default 1), `pageSize` (default 20)

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "userId": "uuid",
      "displayName": "Ahmed Khan",
      "gender": "Male",
      "ageYears": 28,
      "submittedAt": "2026-05-03T07:00:00Z",
      "completionPercentage": 75
    }
  ],
  "totalCount": 5,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `GET /api/admin/profiles/{id}`

**Auth:** Admin

**Success — `200 OK`:** Full profile detail including MongoDB data and PostgreSQL index fields.

**Error responses:** `404` if user not found.

---

### `PATCH /api/admin/profiles/{id}/approve`

**Auth:** Admin

**Request body:** *(none)*

**Success — `200 OK`:**
```json
{
  "userId": "uuid",
  "newStatus": "Active",
  "message": "Profile approved."
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `404` | User not found |
| `409` | Profile not in PendingReview state |

**Postman notes:** After this call, verify the profile appears in search results.

---

### `PATCH /api/admin/profiles/{id}/reject`

**Auth:** Admin

**Request body:**
```json
{
  "reason": "Profile contains inappropriate content."
}
```

**Success — `200 OK`:** Same shape as approve response with new status.

---

### `PATCH /api/admin/profiles/{id}/suspend`

**Auth:** Admin

**Request body:**
```json
{
  "reason": "Repeated harassment reports."
}
```

**Success — `200 OK`**

**Postman notes:** After this, confirm the user's `IsActive = false` by checking `/api/auth/me` with their token — they should receive 401 on protected endpoints.

---

### `PATCH /api/admin/profiles/{id}/verify-identity`

**Auth:** Admin

**Request body:** *(none)*

**Success — `204 No Content`**

> Sets `IsIdentityVerified = true`. Verified badge appears on the profile.

---

### `DELETE /api/admin/profiles/{id}/verify-identity`

**Auth:** Admin

**Success — `204 No Content`**

---

### `GET /api/admin/audit-logs`

**Auth:** Admin

**Query params:** `page`, `pageSize`, optional `adminId` / `entityId` / `action` filters

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "adminId": "uuid",
      "adminEmail": "admin@test.bd",
      "action": "ApproveProfile",
      "entityType": "Profile",
      "entityId": "uuid",
      "reason": null,
      "createdAt": "2026-05-03T08:00:00Z"
    }
  ],
  "totalCount": 10,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `GET /api/admin/reports`

**Auth:** Admin

**Query params:** `status` (`Active`\|`Dismissed`), `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "reportedUserId": "uuid",
      "reportedDisplayName": "Ahmed Khan",
      "reason": "Fake",
      "description": "Stolen photos.",
      "status": "Active",
      "createdAt": "2026-05-03T09:00:00Z"
    }
  ],
  "totalCount": 2,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `PATCH /api/admin/reports/{id}/dismiss`

**Auth:** Admin

**Request body:** *(none)*

**Success — `204 No Content`**

> Marks report as `Dismissed`. Idempotent — repeated calls return 204.

---

### `PATCH /api/admin/reports/{id}/suspend`

**Auth:** Admin

**Request body:**
```json
{
  "reason": "Confirmed fake profile after review."
}
```

**Success — `200 OK`:** Returns updated profile suspension info.

> Atomically suspends the reported profile **and** dismisses the report. Both actions appear in the audit log.

---

### `GET /api/admin/photos/pending`

**Auth:** Admin

**Query params:** `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "userId": "uuid",
      "displayName": "Sabrina Islam",
      "photoUrl": "/uploads/photos/uuid.jpg",
      "uploadedAt": "2026-05-03T08:00:00Z"
    }
  ],
  "totalCount": 4
}
```

---

### `PATCH /api/admin/photos/{userId}/approve`

**Auth:** Admin

**Request body:** *(none)*

**Success — `204 No Content`**

---

### `PATCH /api/admin/photos/{userId}/reject`

**Auth:** Admin

**Request body:**
```json
{
  "reason": "Photo does not show the person's face clearly."
}
```

**Success — `204 No Content`**

---

### `GET /api/admin/contact-unlocks`

**Auth:** Admin

**Query params:** `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "unlockedByUserId": "uuid",
      "unlockedByDisplayName": "Rahim Ahmed",
      "profileUserId": "uuid",
      "profileDisplayName": "Sabrina Islam",
      "unlockedAt": "2026-05-03T09:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

### `GET /api/admin/chat/reports`

**Auth:** Admin

**Query params:** `status` (`Open`\|`Dismissed`), `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [
    {
      "reportId": "uuid",
      "messageId": "uuid",
      "messageBody": "You should send me money...",
      "conversationId": "uuid",
      "reporterId": "uuid",
      "reporterName": "Sabrina Islam",
      "senderId": "uuid",
      "senderName": "Ahmed Khan",
      "reason": "Scam attempt",
      "status": "Open",
      "createdAt": "2026-05-03T09:00:00Z",
      "isConversationClosed": false
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `PATCH /api/admin/chat/reports/{id}/dismiss`

**Auth:** Admin

**Success — `204 No Content`**

> Idempotent. Sets `Status = Dismissed`, records `ReviewedByAdminId` and `ReviewedAt`. Audit log created.

---

### `POST /api/admin/chat/conversations/{convId}/close`

**Auth:** Admin

**Request body:** *(none)*

**Success — `204 No Content`**

> Sets `IsClosed = true` on the conversation. Both participants will see `isClosed: true` in the thread response. No further messages can be sent. Idempotent.

**Postman notes:** After this call, attempt to send a message as either participant and confirm `409` is returned.

---

## 10. Membership & Payment

### `GET /api/membership/plans`

**Auth:** None (public endpoint)

**Success — `200 OK`:**
```json
[
  {
    "plan": "Free",
    "tagline": "Get started",
    "monthlyInterestLimit": 5,
    "advancedSearch": false,
    "profileBoost": false,
    "contactUnlock": false,
    "monthlyPriceBdt": 0
  },
  {
    "plan": "Silver",
    "tagline": "Popular choice",
    "monthlyInterestLimit": 30,
    "advancedSearch": true,
    "profileBoost": false,
    "contactUnlock": true,
    "monthlyPriceBdt": 499
  },
  {
    "plan": "Gold",
    "tagline": "Best value",
    "monthlyInterestLimit": -1,
    "advancedSearch": true,
    "profileBoost": true,
    "contactUnlock": true,
    "monthlyPriceBdt": 999
  }
]
```

> `monthlyInterestLimit: -1` means unlimited.

---

### `GET /api/membership/me`

**Auth:** Bearer token

**Success — `200 OK`:**
```json
{
  "plan": "Silver",
  "startedAt": "2026-04-01T00:00:00Z",
  "expiresAt": "2026-05-01T00:00:00Z",
  "monthlyInterestLimit": 30,
  "interestsSentThisMonth": 8,
  "remainingInterests": 22,
  "advancedSearch": true,
  "profileBoost": false,
  "contactUnlock": true,
  "monthlyPriceBdt": 499
}
```

---

### `POST /api/orders`

**Auth:** Bearer token

**Request body:**
```json
{
  "plan": "Silver"
}
```

**`plan` values:** `Free`, `Basic`, `Premium`, `Vip` *(check `/api/membership/plans` for active plans)*

**Success — `201 Created`:**
```json
{
  "id": "uuid",
  "plan": "Silver",
  "amountBdt": 499.00,
  "status": "Pending",
  "durationDays": 30,
  "attemptCount": 0,
  "createdAt": "2026-05-03T09:00:00Z",
  "paidAt": null,
  "latestAttemptId": null,
  "latestAttemptStatus": null
}
```

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.environment.set("orderId", pm.response.json().id);
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid plan name |
| `401` | No auth |

---

### `GET /api/orders/me`

**Auth:** Bearer token

**Query params:** `page`, `pageSize`

**Success — `200 OK`:**
```json
{
  "items": [ { ...OrderResponse } ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `POST /api/orders/{orderId}/submit-payment`

**Auth:** Bearer token

**Request body:**
```json
{
  "gatewayName": "bKash",
  "transactionId": "TXN-20260503-001",
  "notes": "Paid via bKash personal"
}
```

**Success — `201 Created`:**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "userId": "uuid",
  "userEmail": "user@example.com",
  "plan": "Silver",
  "amountBdt": 499.00,
  "status": "Pending",
  "gatewayName": "bKash",
  "gatewayTransactionId": "TXN-20260503-001",
  "failureReason": null,
  "attemptedAt": "2026-05-03T09:00:00Z",
  "completedAt": null
}
```

**Postman test script:**
```javascript
pm.test("Status 201", () => pm.response.to.have.status(201));
pm.environment.set("paymentAttemptId", pm.response.json().id);
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing required fields |
| `401` | No auth |
| `404` | Order not found |
| `409` | Transaction ID already used |

**Test cases:**

| Case | Input | Expected |
|------|-------|----------|
| Happy path | Valid body + pending order | 201 + attempt object |
| Duplicate txn ID | Same `transactionId` again | 409 |
| Missing gateway | Omit `gatewayName` | 400 |
| Already paid order | Order already in Paid state | 409 |

---

### `GET /api/admin/payment-attempts`

**Auth:** Admin

**Query params:** `status` (`Pending`\|`Completed`\|`Failed`), `page`, `pageSize`, `plan`

**Success — `200 OK`:**
```json
{
  "items": [ { ...PaymentAttemptResponse } ],
  "totalCount": 5,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### `PATCH /api/admin/payment-attempts/{id}/verify`

**Auth:** Admin

**Request body:** *(none)*

**Success — `200 OK`:** Updated `PaymentAttemptResponse` with `status: "Completed"`.

**Postman notes:** After this call, `GET /api/membership/me` for the user should show the new plan with a future `expiresAt`. Also confirm `isPremiumMember: true` in search results for that user.

---

### `PATCH /api/admin/payment-attempts/{id}/reject`

**Auth:** Admin

**Request body:**
```json
{
  "reason": "Transaction ID not found in bKash records."
}
```

**Success — `200 OK`:** Updated attempt with `status: "Failed"` and `failureReason` set.

---

## 11. Health Check Endpoints

### `GET /health`

**Auth:** None (no rate limiting applied)

**Success — `200 OK`:**
```json
{
  "status": "Healthy",
  "results": {}
}
```

> Liveness check only — no database queries. Returns 200 as long as the process is running.

**Test cases:**

| Case | Expected |
|------|----------|
| Normal | 200 `Healthy` |
| 100 rapid requests (no rate limit) | All 200 — never 429 |

---

### `GET /health/ready`

**Auth:** None (no rate limiting applied)

**Success — `200 OK`:**
```json
{
  "status": "Healthy",
  "results": {
    "postgres": { "status": "Healthy", "duration": "00:00:00.012" },
    "mongodb":  { "status": "Healthy", "duration": "00:00:00.008" }
  }
}
```

**Degraded/Unhealthy — `503 Service Unavailable`:**
```json
{
  "status": "Unhealthy",
  "results": {
    "postgres": { "status": "Unhealthy", "exception": "Connection refused" },
    "mongodb":  { "status": "Healthy" }
  }
}
```

**Test cases:**

| Case | Expected |
|------|----------|
| Both DB healthy | 200 `Healthy` |
| PostgreSQL down | 503; postgres entry shows `Unhealthy` |
| MongoDB down | 503; mongodb entry shows `Unhealthy` |
| 100 rapid requests | All 200 — health endpoints bypass rate limiting |

---

## Appendix A — Enum Quick Reference

| Enum | Values |
|------|--------|
| `Gender` | `Male`, `Female` |
| `Religion` | `Islam`, `Hinduism`, `Christianity`, `Buddhism`, `Other` |
| `IslamicSect` | `Sunni`, `Shia`, `Other` |
| `MaritalStatus` | `NeverMarried`, `Divorced`, `Widowed`, `Separated` |
| `EducationLevel` | `BelowSSC`, `SSC`, `HSC`, `Diploma`, `Bachelor`, `Masters`, `PhD`, `PostDoc` |
| `EmploymentType` | `Employed`, `SelfEmployed`, `BusinessOwner`, `Student`, `Unemployed` |
| `BodyType` | `Slim`, `Average`, `Athletic`, `Heavy` |
| `Complexion` | `VeryFair`, `Fair`, `Wheatish`, `Dark` |
| `FamilyStatus` | `LowerClass`, `MiddleClass`, `UpperMiddleClass`, `Rich` |
| `FamilyType` | `Nuclear`, `Joint` |
| `PrayerHabit` | `FiveTimes`, `Sometimes`, `Rarely`, `Never` |
| `DietType` | `HalalOnly`, `Vegetarian`, `NonVegetarian`, `Other` |
| `SmokingHabit` | `Never`, `Occasionally`, `Regularly` |
| `PhotoVisibility` | `Public`, `ApprovedUsersOnly`, `Hidden` |
| `SearchSortBy` | `LastActive`, `Newest`, `Completion` |
| `ReportReason` | `Fake`, `Inappropriate`, `Scam`, `Harassment`, `Other` |
| `TicketCategory` | `Payment`, `Profile`, `Report`, `Account`, `Other` |
| `TicketStatus` | `Open`, `InProgress`, `Resolved`, `Closed` |
| `MembershipPlan` | `Free`, `Basic`, `Premium`, `Vip` |
| `InterestStatus` | `Pending`, `Accepted`, `Rejected`, `Cancelled` |
| `ProfileStatus` | `Draft`, `PendingReview`, `Active`, `Paused`, `Deleted` |

---

## Appendix B — Common HTTP Status Codes Used

| Code | Meaning in this API |
|------|---------------------|
| `200` | Success with response body |
| `201` | Resource created |
| `204` | Success, no body |
| `400` | Validation error or bad request |
| `401` | Missing, invalid, or expired token |
| `403` | Authenticated but not authorised (wrong role or resource ownership) |
| `404` | Resource not found |
| `409` | Conflict (duplicate, wrong state) |
| `429` | Rate limit exceeded |
| `503` | Service unavailable (health check only) |

---

## Appendix C — Suggested Postman Collection Folder Structure

```
MatrimonialBD API
├── 01 - Auth
│   ├── Register
│   ├── Login (User)
│   ├── Login (Admin)
│   ├── Refresh Token
│   ├── Logout
│   └── Get Me
├── 02 - Email Verification
│   ├── Verify Email
│   └── Resend Verification
├── 03 - Profile
│   ├── Create Profile
│   ├── Get My Profile
│   ├── Update Basic Info
│   ├── Update Physical Info
│   ├── Update Education
│   ├── Update Career
│   ├── Update Family
│   ├── Update Religion
│   ├── Update Lifestyle
│   ├── Update Partner Expectations
│   ├── Update Contact Info
│   ├── Update Visibility
│   ├── Submit for Review
│   ├── Get Contact Status
│   ├── Unlock Contact
│   ├── Record Profile View
│   └── Get My Viewers
├── 04 - Photos
│   ├── Upload Photo
│   ├── Update Photo Visibility
│   ├── Delete Photo
│   └── Get Photo URL
├── 05 - Search
│   └── Search Profiles
├── 06 - Interests
│   ├── Send Interest
│   ├── Get Sent
│   ├── Get Received
│   ├── Accept Interest
│   ├── Reject Interest
│   └── Cancel Interest
├── 07 - Saved Profiles
│   ├── Save Profile
│   ├── Get Saved
│   └── Remove Saved
├── 08 - Profile Reports
│   └── Report Profile
├── 09 - Notifications
│   ├── Get Notifications
│   ├── Unread Count
│   ├── Mark Read
│   └── Mark All Read
├── 10 - Chat
│   ├── Get Conversations
│   ├── Get Thread
│   ├── Send Message
│   ├── Mark Read
│   ├── Block User
│   ├── Unblock User
│   ├── Unread Count
│   └── Report Message
├── 11 - Membership & Orders
│   ├── Get Plans (public)
│   ├── Get My Membership
│   ├── Create Order
│   ├── Get My Orders
│   └── Submit Payment
├── 12 - Support
│   ├── Create Ticket
│   ├── Get My Tickets
│   ├── Get Ticket Detail
│   └── Add Message
├── 13 - Matches
│   └── Get Recommended Matches
├── 14 - Admin — Profiles
│   ├── Get Dashboard Metrics
│   ├── Get Pending Profiles
│   ├── Get Profile Detail
│   ├── Approve Profile
│   ├── Reject Profile
│   ├── Suspend Profile
│   ├── Verify Identity
│   ├── Revoke Identity
│   └── Get Audit Logs
├── 15 - Admin — Reports & Photos
│   ├── Get Reports
│   ├── Dismiss Report
│   ├── Suspend from Report
│   ├── Get Pending Photos
│   ├── Approve Photo
│   └── Reject Photo
├── 16 - Admin — Payments
│   ├── Get Payment Attempts
│   ├── Verify Payment
│   ├── Reject Payment
│   └── Get Contact Unlocks
├── 17 - Admin — Chat
│   ├── Get Chat Reports
│   ├── Dismiss Chat Report
│   └── Close Conversation
├── 18 - Admin — Support
│   ├── Get All Tickets
│   ├── Get Ticket Detail
│   ├── Add Staff Message
│   └── Update Ticket Status
└── 19 - Health
    ├── Liveness (GET /health)
    └── Readiness (GET /health/ready)
```

---

*End of API Test Plan v1*
