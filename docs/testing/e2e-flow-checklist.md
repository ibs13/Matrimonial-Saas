# End-to-End Flow Checklist — Matrimonial SaaS v1 Release

**Purpose:** Final pre-release gate. Every checkbox must be ticked before tagging v1.  
**Last Updated:** 2026-05-03

---

## How to Use

Work through the flows **in order** — each builds on the state created by the previous one. Check off each item as you verify it. If any item fails, log it as a bug and do not mark the flow complete until it is resolved and re-verified.

**Pass criteria:** All items checked.  
**Fail criteria:** Any single unchecked item.

---

## Test Personas

| Label | Email | Password | Role | Notes |
|-------|-------|----------|------|-------|
| **User A** | `usera@test.bd` | `TestPass1!` | User | Primary profile owner, male |
| **User B** | `userb@test.bd` | `TestPass1!` | User | Second user, female, sends interest |
| **Admin** | `admin@test.bd` | `AdminPass1!` | Admin | Must have `Role = 'Admin'` in DB |

> **Admin setup:** Before starting, insert the admin user directly into PostgreSQL:
> ```sql
> INSERT INTO "Users" ("Id", "Email", "PasswordHash", "Role", "IsActive", "IsEmailVerified", "CreatedAt")
> VALUES (gen_random_uuid(), 'admin@test.bd',
>         '<bcrypt-hash-of-AdminPass1!>', 'Admin', true, true, now());
> ```
> Or register normally and then run `UPDATE "Users" SET "Role" = 'Admin' WHERE "Email" = 'admin@test.bd';`

---

## Preflight: Environment

- [ ] `.env` file created from `.env.example` with all secrets filled in (`POSTGRES_PASSWORD`, `MONGO_PASSWORD`, `JWT_SECRET` ≥ 32 chars)
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `NEXT_PUBLIC_API_URL` points to `http://localhost:5000`
- [ ] No leftover data from a previous test run (or databases wiped clean)
- [ ] Admin user exists in the database with `Role = 'Admin'`

---

## Flow 1 — Visitor Views Landing Page and Pricing

**Persona:** Anonymous browser (no account)  
**Start:** Fresh browser, no session

- [ ] Navigate to `http://localhost:3000` — the home/landing page loads without errors
- [ ] Page displays the application name **MatrimonialBD** and a call-to-action (Register / Login)
- [ ] Navigate to `http://localhost:3000/membership` — membership plans page loads
- [ ] At least **two** plan tiers are visible with names, prices (BDT), and feature bullets
- [ ] `GET http://localhost:5000/api/membership/plans` returns `200` with a JSON array of plan objects, each containing `plan`, `monthlyPriceBdt`, and feature flags — **no auth token needed**
- [ ] Clicking **Register** or **Login** links navigates to the correct auth page
- [ ] Attempting to navigate directly to `http://localhost:3000/dashboard` without a session redirects to `/login`
- [ ] Attempting to navigate directly to `http://localhost:3000/profile/setup` without a session redirects to `/login`

---

## Flow 2 — User Registration

**Persona:** User A  
**Start:** `/register` page

- [ ] Navigate to `http://localhost:3000/register`
- [ ] Registration form renders with Email and Password fields
- [ ] Submit the form with **invalid email** (`notanemail`) — inline validation error appears, form not submitted
- [ ] Submit the form with **password shorter than 8 characters** — validation error appears
- [ ] Submit the form with valid credentials: `usera@test.bd` / `TestPass1!`
- [ ] `POST /api/auth/register` returns `201` with `accessToken`, `refreshToken`, and `isEmailVerified: false`
- [ ] Browser stores the access token (visible in localStorage / cookie depending on implementation)
- [ ] User is redirected to `/dashboard` or a verification prompt after registration
- [ ] Attempt to register **again with the same email** — `POST /api/auth/register` returns `409 Conflict`
- [ ] Repeat the above to register **User B** (`userb@test.bd` / `TestPass1!`)

---

## Flow 3 — Email Verification

**Persona:** User A (just registered, `isEmailVerified: false`)

- [ ] Dashboard or navbar shows an **"Email not verified"** banner or prompt
- [ ] Check the **API server console** — `DevEmailSender` has printed a verification URL of the form `http://localhost:5000/api/auth/verify-email?token=...`
- [ ] Open the verification URL in the browser (or send it as a GET request in Postman)
- [ ] Response is `200` with a success message
- [ ] `GET /api/auth/me` now returns `isEmailVerified: true`
- [ ] The "Email not verified" banner disappears from the UI
- [ ] Attempt to use the **same verification link a second time** — response is `400` or `409` (token already used)
- [ ] Repeat email verification for **User B**

---

## Flow 4 — Login

**Persona:** User A (verified)  
**Start:** Logged out

- [ ] Navigate to `http://localhost:3000/login`
- [ ] Submit with **wrong password** — `POST /api/auth/login` returns `401`; error message shown in UI; no tokens issued
- [ ] Submit with **non-existent email** — returns `401`; error message does not reveal whether the email is registered
- [ ] Submit with correct credentials (`usera@test.bd` / `TestPass1!`)
- [ ] `POST /api/auth/login` returns `200` with `accessToken`, `refreshToken`, `role: "User"`, `isEmailVerified: true`
- [ ] Browser redirects to `/dashboard`
- [ ] Navbar shows the user's email initial in the avatar button
- [ ] `GET /api/auth/me` with the access token returns the correct `id`, `email`, and `role`
- [ ] Send `POST /api/auth/refresh` with the `refreshToken` — returns `200` with a **new** access token; the old refresh token is now invalid
- [ ] Confirm the old refresh token is rejected: `POST /api/auth/refresh` with the previous refresh token returns `401`

---

## Flow 5 — Profile Creation and Editing

**Persona:** User A (logged in, email verified)

**Create profile**
- [ ] Navigate to `http://localhost:3000/profile/setup`
- [ ] `POST /api/profile` is triggered (or a "Create Profile" button exists) — returns `201`
- [ ] `GET /api/profile/me` returns a profile with `status: "Draft"` and `completionPercentage: 0`

**Fill Basic Info**
- [ ] Submit the Basic Info section with: `displayName: "Ahmed Khan"`, `gender: "Male"`, `dateOfBirth: "1995-06-20"`, `religion: "Islam"`, `maritalStatus: "NeverMarried"`, `countryOfResidence: "Bangladesh"`, `division: "Dhaka"`, `district: "Dhaka"`
- [ ] `PATCH /api/profile/basic` returns `200`
- [ ] `completionPercentage` increases from 0

**Fill remaining sections**
- [ ] Submit Physical Info (`heightCm: 175`, `bodyType: "Average"`, `complexion: "Wheatish"`) — `PATCH /api/profile/physical` returns `200`
- [ ] Submit Education Info (`educationLevel: "Bachelor"`, `fieldOfStudy: "Engineering"`) — `PATCH /api/profile/education` returns `200`
- [ ] Submit Career Info (`employmentType: "Employed"`, `jobTitle: "Software Engineer"`) — `PATCH /api/profile/career` returns `200`
- [ ] Submit Family Info (`familyType: "Nuclear"`, `familyStatus: "MiddleClass"`) — `PATCH /api/profile/family` returns `200`
- [ ] Submit Religion Info (`prayerHabit: "FiveTimes"`) — `PATCH /api/profile/religion` returns `200`
- [ ] Submit Lifestyle Info — `PATCH /api/profile/lifestyle` returns `200`
- [ ] Submit Partner Expectations (`ageMin: 22`, `ageMax: 30`, `minEducationLevel: "Bachelor"`) — `PATCH /api/profile/partner-expectations` returns `200`
- [ ] Submit Contact Info (`phone: "+8801711000001"`, `presentAddress: "Mirpur, Dhaka"`) — `PATCH /api/profile/contact` returns `200`
- [ ] Set Visibility (`profileVisible: true`) — `PATCH /api/profile/visibility` returns `200`
- [ ] `GET /api/profile/me` shows `completionPercentage` ≥ 60
- [ ] Contact fields (`phone`, `presentAddress`) are **present** in `GET /api/profile/me` (own profile view)
- [ ] Repeat profile creation and filling for **User B** (female, Sylhet division)

---

## Flow 6 — Profile Photo Upload

**Persona:** User A

- [ ] Navigate to the photo upload section in `/profile/setup`
- [ ] Upload a valid JPEG image (≤ 5 MB) via `POST /api/profile/photo` (multipart/form-data, field name `photo`)
- [ ] Response is `200` with `photoUrl` set and `status: "Pending"`
- [ ] `GET /api/profile/me` shows a `photoUrl` value
- [ ] Attempt to upload a **non-image file** (e.g., `.txt`) — returns `400`
- [ ] As **User B** (a different logged-in user), `GET /api/profile/{userAId}/photo` returns no photo URL or null — photo is pending admin approval
- [ ] Photo appears in the **admin photo review queue** (`GET /api/admin/photos/pending` returns the entry)
- [ ] Repeat photo upload for **User B**

---

## Flow 7 — Profile Submission for Review

**Persona:** User A

- [ ] Click "Submit for Review" button in the UI or call `POST /api/profile/submit`
- [ ] Response is `200`; profile `status` changes from `Draft` to `PendingReview`
- [ ] `GET /api/profile/me` confirms `status: "PendingReview"`
- [ ] Attempting `POST /api/profile/submit` a **second time** returns `409`
- [ ] The profile appears in `GET /api/admin/profiles/pending` (verify as admin)
- [ ] Repeat submission for **User B**

---

## Flow 8 — Admin Approves / Rejects Profile

**Persona:** Admin

**Login as admin**
- [ ] `POST /api/auth/login` with `admin@test.bd` / `AdminPass1!` returns `200` with `role: "Admin"`
- [ ] Navigate to `http://localhost:3000/admin/profiles` — the review queue page loads
- [ ] Both User A and User B profiles are visible in the pending list

**Approve User A's photo first**
- [ ] `GET /api/admin/photos/pending` shows User A's pending photo
- [ ] `PATCH /api/admin/photos/{userAId}/approve` returns `204`
- [ ] Repeat for User B's photo

**Test rejection flow (use a throwaway profile or re-submit after)**
- [ ] `PATCH /api/admin/profiles/{userAId}/reject` with `{ "reason": "Incomplete information." }` returns `200`
- [ ] User A's profile `status` returns to `Draft` (or a rejected state)
- [ ] User A re-submits the profile (`POST /api/profile/submit` returns `200`)
- [ ] Profile reappears in the pending queue

**Approve both profiles**
- [ ] `PATCH /api/admin/profiles/{userAId}/approve` returns `200` with `newStatus: "Active"`
- [ ] `PATCH /api/admin/profiles/{userBId}/approve` returns `200`

**Verify audit trail**
- [ ] `GET /api/admin/audit-logs` returns entries for `ApproveProfile` and `RejectProfile` actions with correct `adminEmail`, `entityId`, and timestamps
- [ ] `GET /api/admin/metrics` shows `approvedProfiles` count increased by 2

---

## Flow 9 — Approved Profile Appears in Search

**Persona:** User B (approved profile)

- [ ] Log in as **User B**
- [ ] `POST /api/search` with empty body `{}` returns `200`
- [ ] **User A's profile** appears in the results list (gender = Male, status = Active)
- [ ] User B's **own profile** does **not** appear in the results
- [ ] User A's profile card shows `displayName`, `ageYears`, `religion`, `district` — but **no phone, full name, or email**
- [ ] User A's **approved photo** is now visible (`photoUrl` is populated in the search result)
- [ ] `POST /api/search` with `{ "gender": "Female" }` does **not** return User A (Male)
- [ ] `POST /api/search` with `{ "gender": "Male", "division": "Dhaka" }` returns User A
- [ ] `POST /api/search` with `{ "ageMin": 99 }` returns an empty results list (no matches at age 99)
- [ ] Pagination works: `POST /api/search` with `{ "page": 1, "pageSize": 2 }` returns at most 2 results and includes `totalCount`

---

## Flow 10 — Another User Views Profile Detail

**Persona:** User B viewing User A's profile

- [ ] From search results, click User A's profile (or navigate to `/profile/{userAId}`)
- [ ] Profile detail page loads with User A's `displayName`, `gender`, `religion`, `maritalStatus`, `educationLevel`, `division`, `district`
- [ ] User A's `fullName`, `phone`, and `presentAddress` are **not visible** on the page
- [ ] User A's **approved photo** is visible (photo visibility is `Public`)
- [ ] Verification badges section is present (email verified badge shown if applicable)
- [ ] `POST /api/profile/{userAId}/view` is called — returns `200` or `204`
- [ ] Log in as **User A** and verify `GET /api/profile/viewers` includes User B's entry

---

## Flow 11 — Another User Sends Interest

**Persona:** User B sends interest to User A

- [ ] Log in as **User B**
- [ ] From User A's profile detail page, click "Send Interest" (or call `POST /api/interests` with `{ "receiverId": "{userAId}" }`)
- [ ] Response is `201` with `status: "Pending"`
- [ ] `GET /api/interests/sent` for User B includes the new interest with `status: "Pending"`
- [ ] Log in as **User A** — `GET /api/interests/received` shows the pending interest from User B
- [ ] **Notification created:** `GET /api/notifications` for User A returns a notification of type `InterestReceived`
- [ ] `GET /api/notifications/unread-count` for User A returns `count ≥ 1`
- [ ] Attempting to send a **second interest** from User B to User A returns `409`
- [ ] Attempting to send interest to **own profile** returns `400`

---

## Flow 12 — Profile Owner Accepts / Rejects Interest

**Persona:** User A accepts User B's interest

**Test rejection first (use a separate interest if available, or test rejection logic separately)**
- [ ] As User A, `PATCH /api/interests/{id}/reject` on a different pending interest returns `200` with `status: "Rejected"`
- [ ] Attempting to accept a rejected interest returns `409`

**Accept User B's interest**
- [ ] Log in as **User A**
- [ ] Navigate to `http://localhost:3000/interests/received` — User B's interest is listed
- [ ] Click "Accept" (or call `PATCH /api/interests/{interestId}/accept`)
- [ ] Response is `200` with `status: "Accepted"`
- [ ] Log in as **User B** — `GET /api/interests/sent` shows the interest as `Accepted`
- [ ] **Notification created:** User B receives a notification of type `InterestAccepted`
- [ ] Mark User A's notification as read: `PATCH /api/notifications/{id}/read` returns `204`; `unread-count` decrements by 1

**Chat is now unlocked**
- [ ] As User B, `GET /api/chat/conversations/{userAId}` returns `200` (thread accessible, even with 0 messages)
- [ ] As User B, `POST /api/chat/conversations/{userAId}/messages` with `{ "body": "Hello Ahmed!" }` returns `201`
- [ ] Response includes `id`, `senderId`, `body`, `createdAt`, `isRead: false`
- [ ] Log in as User A — `GET /api/chat/unread-count` returns `count: 1`
- [ ] `GET /api/chat/conversations` for User A shows the conversation with User B and `unreadCount: 1`
- [ ] As User A, `PATCH /api/chat/conversations/{userBId}/read` returns `204`; `unread-count` drops to 0
- [ ] As User A, reply with a message — User B can see it in the thread
- [ ] A user with **no accepted interest** with User C cannot message User C: `POST /api/chat/conversations/{userCId}/messages` returns `409`

---

## Flow 13 — Contact Details Remain Hidden Unless Unlocked

**Persona:** User B (no premium membership)

- [ ] Log in as **User B**
- [ ] `GET /api/profile/{userAId}/contact` returns `isUnlocked: false`, `canUnlock: false`, `blockReason: "NoPlan"`
- [ ] No contact fields (`phone`, `email`, `presentAddress`) are present in the response
- [ ] User A's contact fields are **absent** from the search result item returned by `POST /api/search`
- [ ] User A's contact fields are **absent** from the profile detail page in the UI

**Premium unlock path (simulate by verifying a payment as admin)**
- [ ] User B creates an order: `POST /api/orders` with `{ "plan": "Silver" }` returns `201`; save `orderId`
- [ ] User B submits payment: `POST /api/orders/{orderId}/submit-payment` with bKash transaction details returns `201`; save `paymentAttemptId`
- [ ] Log in as **Admin**: `PATCH /api/admin/payment-attempts/{paymentAttemptId}/verify` returns `200`
- [ ] Log in as **User B**: `GET /api/membership/me` shows `plan: "Silver"`, `contactUnlock: true`, and a future `expiresAt`
- [ ] `GET /api/profile/{userAId}/contact` now returns `canUnlock: true`
- [ ] `POST /api/profile/{userAId}/unlock-contact` returns `200` with `isUnlocked: true` and **all contact fields populated** (`phone`, `presentAddress`, etc.)
- [ ] Calling unlock a **second time** is idempotent — returns `200` without error and without creating a duplicate record
- [ ] Log in as **Admin**: `GET /api/admin/contact-unlocks` shows the unlock event with correct `unlockedByDisplayName` and `profileDisplayName`

---

## Flow 14 — User Reports a Profile

**Persona:** User B reports User A's profile

- [ ] Log in as **User B**
- [ ] `POST /api/reports/{userAId}` with `{ "reason": "Fake", "description": "Profile appears to use stolen photos." }` returns `201`
- [ ] Response contains `id`, `reason: "Fake"`, `status: "Active"`, and `createdAt`
- [ ] Attempting the **same report again** returns `409` (duplicate)
- [ ] Attempting to report **own profile** returns `400`
- [ ] Report appears in admin queue: `GET /api/admin/reports?status=Active` returns the new entry
- [ ] `GET /api/admin/metrics` shows `activeReports` count ≥ 1

---

## Flow 15 — Admin Reviews Report

**Persona:** Admin

- [ ] Log in as **Admin**
- [ ] Navigate to `http://localhost:3000/admin/profiles` and verify the reports tab/section is accessible
- [ ] `GET /api/admin/reports?status=Active` returns User B's report against User A
- [ ] `PATCH /api/admin/reports/{reportId}/dismiss` returns `204`
- [ ] `GET /api/admin/reports?status=Active` no longer shows that report
- [ ] `GET /api/admin/reports?status=Dismissed` shows the dismissed report
- [ ] Audit log contains a `DismissReport` entry for the admin action

---

## Flow 16 — Admin Suspends Profile

**Persona:** Admin (suspending User A's profile)

> Note: This flow will break subsequent flows that depend on User A being active. Run it last among the functional flows, or use a throwaway third test profile.

- [ ] Log in as **Admin**
- [ ] `PATCH /api/admin/profiles/{userAId}/suspend` with `{ "reason": "Repeated policy violations." }` returns `200`
- [ ] `GET /api/admin/metrics` shows `suspendedProfiles` count increased by 1
- [ ] Audit log contains a `SuspendProfile` entry with `reason` and `adminEmail`
- [ ] Log in as **User A** — `GET /api/auth/me` still returns `200` but `IsActive` is now `false`
- [ ] **User A cannot send messages:** `POST /api/chat/conversations/{userBId}/messages` returns `401` ("account not active")
- [ ] **User A disappears from search:** `POST /api/search` as User B returns results that do **not** include User A
- [ ] **User A cannot send interests:** `POST /api/interests` as User A returns `401` or `403`
- [ ] Admin re-activates for subsequent tests: `PATCH /api/admin/profiles/{userAId}/approve` returns `200`

---

## Flow 17 — User Logs Out

**Persona:** User A

- [ ] Log in as **User A** (ensure a valid session exists)
- [ ] Record the current `refreshToken`
- [ ] Click "Sign out" in the navbar dropdown (or call `POST /api/auth/logout`)
- [ ] `POST /api/auth/logout` returns `204`
- [ ] Browser clears the stored access and refresh tokens (local storage / cookies cleared)
- [ ] The app redirects to `/login`
- [ ] Attempting `GET /api/auth/me` with the old access token returns `401`
- [ ] Attempting `POST /api/auth/refresh` with the recorded `refreshToken` returns `401` (token revoked)
- [ ] Navigating to `http://localhost:3000/dashboard` redirects to `/login`

---

## Flow 18 — Health Endpoints Work

**Persona:** Anonymous (no auth token)

- [ ] `GET http://localhost:5000/health` returns `200` with `status: "Healthy"` — no auth required
- [ ] `GET http://localhost:5000/health/ready` returns `200` with both `postgres` and `mongodb` checks as `Healthy`
- [ ] Send **20 rapid requests** to `GET /health` in quick succession — all return `200`, none return `429` (health endpoints bypass rate limiting)
- [ ] Response body for `/health/ready` includes individual check results with `status` and `duration` fields
- [ ] The root endpoint `GET http://localhost:5000/` returns `200` with `{ "app": "Matrimonial API", "status": "Running" }`

---

## Flow 19 — Docker Environment Starts Successfully

**Persona:** Developer / DevOps  
**Start:** Clean machine with Docker Desktop running

**Pre-checks**
- [ ] `.env` file exists at project root with all required variables filled (`POSTGRES_PASSWORD`, `MONGO_PASSWORD`, `JWT_SECRET` ≥ 32 chars)
- [ ] No other process is using ports `3000`, `5000`, `5050`, `5432`, `8081`, `27017`

**Start the stack**
- [ ] `docker-compose up --build` completes without fatal errors
- [ ] All 6 containers start: `postgres`, `mongo`, `api`, `web`, `pgadmin`, `mongo-express`
- [ ] `docker-compose ps` shows all containers with status `Up` (or `Up (healthy)` for those with health checks)

**Database health**
- [ ] `postgres` container reaches `healthy` state (pg_isready passes)
- [ ] `mongo` container reaches `healthy` state (mongosh ping passes)

**API health**
- [ ] `api` container starts **after** both databases are healthy (`depends_on` condition satisfied)
- [ ] EF Core migrations run automatically on startup — no migration errors in `docker-compose logs api`
- [ ] `GET http://localhost:5000/health` returns `200 Healthy`
- [ ] `GET http://localhost:5000/health/ready` returns `200` with both database checks passing

**Web app**
- [ ] `http://localhost:3000` loads the landing page in the browser
- [ ] Browser network tab shows API calls going to `http://localhost:5000` with no CORS errors

**Admin tools (optional but verify if used)**
- [ ] `http://localhost:5050` (pgAdmin) loads the login page
- [ ] `http://localhost:8081` (mongo-express) loads after basic auth

**Teardown**
- [ ] `docker-compose down` stops and removes all containers cleanly
- [ ] `docker-compose down -v` removes named volumes — databases are empty on next start (fresh state confirmed)

---

## Flow 20 — CI Checks Pass

**Persona:** Developer  
**Start:** Latest code on `main` branch

### API CI (`api-ci.yml`)

- [ ] Run locally: `cd apps/api && dotnet restore` — completes without errors
- [ ] Run locally: `dotnet build --no-restore -c Release` — **0 errors, 0 warnings**
- [ ] CI job `build-and-test` passes on GitHub Actions for the latest push to `main`
- [ ] GitHub Actions log shows `Build succeeded` with `0 Error(s)` and `0 Warning(s)`
- [ ] If test projects exist: `dotnet test -c Release` passes; if not, CI log shows `"No test projects found — skipping."` without failure

### Web CI (`web-ci.yml`)

- [ ] Run locally: `cd apps/web && npm ci` — installs all dependencies cleanly
- [ ] Run locally: `npm run lint` (runs `eslint`) — **no lint errors**
- [ ] Run locally: `npm run type-check` (runs `tsc --noEmit`) — **0 TypeScript errors**
- [ ] Run locally: `npm run build` with `NEXT_PUBLIC_API_URL=http://localhost:5000` — **build succeeds** with no compilation errors
- [ ] CI job `build-and-lint` passes on GitHub Actions for the latest push to `main`
- [ ] GitHub Actions shows the `Lint`, `Type check`, and `Build` steps all green

### Branch status
- [ ] Both workflow badges on GitHub show **passing** for the `main` branch
- [ ] No open pull requests with failing CI are merged into `main`

---

## Sign-off

Complete this section only after all 20 flows above are fully checked.

| Item | Verified By | Date | Notes |
|------|------------|------|-------|
| All 20 flows checked | | | |
| Zero open P1 bugs | | | |
| Docker stack starts clean from scratch | | | |
| Both CI pipelines green on `main` | | | |
| API build: 0 errors, 0 warnings | | | |
| Web build: lint clean, types clean | | | |

**Release decision**

- [ ] All sign-off items above are complete
- [ ] Release has been reviewed and approved
- [ ] Git tag `v1.0.0` created on `main`

---

*End of E2E Flow Checklist v1*
