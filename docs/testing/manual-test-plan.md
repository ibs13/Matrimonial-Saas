# Manual Test Plan — Matrimonial SaaS v1

**Project:** MatrimonialBD  
**Version:** v1  
**Base URL (API):** `http://localhost:5000`  
**Base URL (Web):** `http://localhost:3000`  
**Last Updated:** 2026-05-03

---

## Roles

| Code | Role | Description |
|------|------|-------------|
| VISITOR | Visitor | Not logged in, no account |
| REGD | Registered User | Account created, email **not** verified |
| VERF | Verified User | Email verified, profile not yet approved |
| OWNER | Profile Owner | Email verified + profile approved and Active |
| PREMIUM | Premium User | Profile Owner with an active paid membership |
| ADMIN | Admin | Role = Admin in the system |

---

## Status Values

`Pass` · `Fail` · `Blocked` · `Skip` · *(blank = not yet run)*

---

## Table of Contents

1. [Registration](#1-registration)
2. [Email Verification](#2-email-verification)
3. [Login & Logout](#3-login--logout)
4. [Profile Creation & Editing](#4-profile-creation--editing)
5. [Profile Photo Upload](#5-profile-photo-upload)
6. [Profile Submission for Review](#6-profile-submission-for-review)
7. [Admin — Profile Approval & Rejection](#7-admin--profile-approval--rejection)
8. [Profile Search](#8-profile-search)
9. [Profile Detail View](#9-profile-detail-view)
10. [Interest Requests](#10-interest-requests)
11. [Contact Unlock (Premium)](#11-contact-unlock-premium)
12. [Saved Profiles (Shortlist)](#12-saved-profiles-shortlist)
13. [Profile Reporting](#13-profile-reporting)
14. [Admin — Report Handling](#14-admin--report-handling)
15. [Notifications](#15-notifications)
16. [Chat — Messaging](#16-chat--messaging)
17. [Chat — Safety & Moderation](#17-chat--safety--moderation)
18. [Membership Plans](#18-membership-plans)
19. [Orders & Payment](#19-orders--payment)
20. [Support Tickets](#20-support-tickets)
21. [AI Match Recommendations](#21-ai-match-recommendations)
22. [Health Check Endpoints](#22-health-check-endpoints)
23. [Security Checks](#23-security-checks)

---

## 1. Registration

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| REG-001 | VISITOR | None | Navigate to `/register`. Submit form with valid email and password (≥8 chars). | Account created. Redirected to dashboard or verification prompt. No plain-text password stored. | P1 | |
| REG-002 | VISITOR | None | Submit registration with an email that lacks `@` (e.g., `notanemail`). | Form shows inline validation error. Request not sent. | P1 | |
| REG-003 | VISITOR | None | Submit registration with password shorter than 8 characters. | Validation error displayed. Account not created. | P1 | |
| REG-004 | VISITOR | REG-001 user exists | Register with the same email a second time. | API returns 409 Conflict or similar. UI shows "email already taken" error. | P1 | |
| REG-005 | VISITOR | None | Submit registration with an empty email field. | HTML5 or client validation prevents submission. | P2 | |
| REG-006 | VISITOR | None | Submit registration with an empty password field. | Validation error. Account not created. | P2 | |
| REG-007 | VISITOR | None | After successful registration, attempt to log in immediately without verifying email. | Login succeeds. `isEmailVerified: false` visible in `/api/auth/me`. App shows email-not-verified banner or restriction. | P1 | |
| REG-008 | VISITOR | None | Register a new user. Check that `POST /api/auth/register` returns `accessToken` and `refreshToken` in the response body. | Both tokens present. `accessToken` is a valid JWT. | P1 | |

---

## 2. Email Verification

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| VER-001 | REGD | REG-001 complete | In development: check server console for the verification link printed by `DevEmailSender`. Open the link. | GET `/api/auth/verify-email?token=…` returns success. `isEmailVerified` becomes `true` in `/api/auth/me`. | P1 | |
| VER-002 | REGD | VER-001 complete | Navigate to the verification link a second time (re-use same token). | Returns 400 or 409 — token already used. | P1 | |
| VER-003 | REGD | Account created | Manually send `GET /api/auth/verify-email?token=invalid-token`. | Returns 400 Bad Request or 404 Not Found. | P1 | |
| VER-004 | REGD | Account created | Send `POST /api/auth/resend-verification` with a valid bearer token. | A new verification email (console log) is produced. Old token is invalidated or a new one created. | P2 | |
| VER-005 | VISITOR | Not logged in | Send `POST /api/auth/resend-verification` without Authorization header. | Returns 401 Unauthorized. | P1 | |
| VER-006 | REGD | Verification email received | Tamper with one character in the token query string. | Returns error. Email remains unverified. | P2 | |

---

## 3. Login & Logout

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| AUTH-001 | REGD | Account exists | POST `/api/auth/login` with correct credentials. | Returns `accessToken`, `refreshToken`, `role`, `isEmailVerified`. | P1 | |
| AUTH-002 | VISITOR | Account exists | POST `/api/auth/login` with wrong password. | Returns 401 Unauthorized. No tokens issued. | P1 | |
| AUTH-003 | VISITOR | None | POST `/api/auth/login` with a non-existent email. | Returns 401. No information leakage about whether email is registered. | P1 | |
| AUTH-004 | REGD | Logged in | POST `/api/auth/refresh` with a valid `refreshToken`. | New `accessToken` issued. Old refresh token rotated (old one no longer valid on next call). | P1 | |
| AUTH-005 | REGD | Logged in | POST `/api/auth/refresh` with an expired or revoked refresh token. | Returns 401. | P1 | |
| AUTH-006 | REGD | Logged in | POST `/api/auth/logout` with valid access token. | Refresh token revoked. Subsequent refresh calls with that token return 401. | P1 | |
| AUTH-007 | REGD | Logged in | GET `/api/auth/me` with valid token. | Returns `id`, `email`, `role`, `isEmailVerified`. | P1 | |
| AUTH-008 | VISITOR | None | GET `/api/auth/me` without Authorization header. | Returns 401. | P1 | |
| AUTH-009 | REGD | 10 rapid login attempts from same IP | Send 11 login requests within 1 minute using an incorrect password. | 11th request returns 429 Too Many Requests. | P2 | |
| AUTH-010 | ADMIN | Admin account exists | GET `/api/auth/admin-only` with admin JWT. | Returns 200. | P2 | |
| AUTH-011 | REGD | Non-admin account | GET `/api/auth/admin-only` with a non-admin JWT. | Returns 403 Forbidden. | P1 | |

---

## 4. Profile Creation & Editing

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| PROF-001 | VERF | Email verified, no profile | POST `/api/profile` (or navigate to `/profile/setup`). | Empty profile created. `GET /api/profile/me` returns a Draft profile with `completionPercentage: 0`. | P1 | |
| PROF-002 | VERF | Profile created | PATCH `/api/profile/basic` with valid basic info (displayName, gender, dateOfBirth, religion, maritalStatus). | Returns updated profile. `completionPercentage` increases. | P1 | |
| PROF-003 | VERF | Basic info saved | PATCH `/api/profile/physical` with valid physical data (heightCm, bodyType, complexion). | Returns success. Physical info persisted. | P2 | |
| PROF-004 | VERF | Profile created | PATCH `/api/profile/education` with valid data. | Returns success. | P2 | |
| PROF-005 | VERF | Profile created | PATCH `/api/profile/career` with valid data. | Returns success. | P2 | |
| PROF-006 | VERF | Profile created | PATCH `/api/profile/family` with valid data. | Returns success. | P2 | |
| PROF-007 | VERF | Profile created | PATCH `/api/profile/religion` with valid data. | Returns success. | P2 | |
| PROF-008 | VERF | Profile created | PATCH `/api/profile/lifestyle` with valid data. | Returns success. | P2 | |
| PROF-009 | VERF | Profile created | PATCH `/api/profile/partner-expectations` with valid data. | Returns success. | P2 | |
| PROF-010 | VERF | Profile created | PATCH `/api/profile/contact` with phone number and address. | Returns success. Contact fields stored. Not exposed in public profile responses. | P1 | |
| PROF-011 | VERF | Profile created | PATCH `/api/profile/visibility` with `profileVisible: true`. | Returns success. Visibility flag updated. | P2 | |
| PROF-012 | VERF | Profile not yet created | PATCH `/api/profile/basic` without first calling `POST /api/profile`. | Returns 404 or 400 — profile does not exist. | P1 | |
| PROF-013 | VISITOR | None | PATCH `/api/profile/basic` without Authorization header. | Returns 401. | P1 | |
| PROF-014 | VERF | Profile exists | GET `/api/profile/me`. | Full MongoDB document returned including all saved sections. | P1 | |
| PROF-015 | VERF | Profile created | Submit displayName exceeding 60 characters. | Returns 400 Bad Request with validation error. | P2 | |

---

## 5. Profile Photo Upload

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| PHOTO-001 | VERF | Profile exists | POST `/api/profile/photo` with a valid JPEG/PNG file (< 5 MB). | Returns success. Photo stored. ProfileIndex `PhotoUrl` populated. Photo status = `Pending` (requires admin approval). | P1 | |
| PHOTO-002 | VERF | No prior photo | POST `/api/profile/photo` with an oversized file (> 5 MB). | Returns 400. No file stored. | P1 | |
| PHOTO-003 | VERF | No prior photo | POST `/api/profile/photo` with a non-image file (e.g., `.txt`). | Returns 400. File rejected. | P2 | |
| PHOTO-004 | VERF | Photo uploaded (Pending) | GET `/api/profile/{userId}/photo` as another user before admin approves. | Photo not returned (or returns placeholder). Photo visibility rules enforced. | P1 | |
| PHOTO-005 | ADMIN | Photo in Pending state | PATCH `/api/admin/photos/{userId}/approve`. | Photo status becomes `Approved`. Audit log entry created. | P1 | |
| PHOTO-006 | ADMIN | Photo in Pending state | PATCH `/api/admin/photos/{userId}/reject` with a reason. | Photo status becomes `Rejected`. User sees reason. | P1 | |
| PHOTO-007 | VERF | Photo uploaded and approved | PATCH `/api/profile/photo/visibility` with `visibility: Hidden`. | Photo is no longer visible in profile detail responses for other users. | P2 | |
| PHOTO-008 | VERF | Photo uploaded | DELETE `/api/profile/photo`. | Photo removed. `PhotoUrl` cleared from ProfileIndex. | P2 | |

---

## 6. Profile Submission for Review

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| SUBMIT-001 | VERF | Profile with basic info filled | POST `/api/profile/submit`. | Profile status changes from `Draft` to `PendingReview`. | P1 | |
| SUBMIT-002 | VERF | Profile already in PendingReview | POST `/api/profile/submit` again. | Returns 409 Conflict — already submitted. | P1 | |
| SUBMIT-003 | VERF | Profile status = Active | POST `/api/profile/submit`. | Returns 409 — already active or invalid state transition. | P1 | |
| SUBMIT-004 | VISITOR | None | POST `/api/profile/submit` without auth. | Returns 401. | P1 | |
| SUBMIT-005 | VERF | Profile submitted | Check admin panel at `/admin/profiles` (or `GET /api/admin/profiles/pending`). | Profile appears in the pending review queue. | P1 | |

---

## 7. Admin — Profile Approval & Rejection

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| APPROVE-001 | ADMIN | Profile in PendingReview | PATCH `/api/admin/profiles/{id}/approve`. | Profile status → `Active`. User can now appear in search results. Audit log entry created. | P1 | |
| APPROVE-002 | ADMIN | Profile in PendingReview | PATCH `/api/admin/profiles/{id}/reject` with a rejection reason. | Profile status → `Draft` (or Rejected state). Reason stored. Audit log created. | P1 | |
| APPROVE-003 | ADMIN | Profile is Active | PATCH `/api/admin/profiles/{id}/suspend` with reason. | Profile status → `Paused`/Suspended. User's `IsActive` set to false. User cannot send messages or interests. | P1 | |
| APPROVE-004 | ADMIN | Profile is Active | PATCH `/api/admin/profiles/{id}/verify-identity`. | `IsIdentityVerified = true`. Verification badge visible on profile. Audit log created. | P2 | |
| APPROVE-005 | ADMIN | Identity verified profile | DELETE `/api/admin/profiles/{id}/verify-identity`. | `IsIdentityVerified = false`. Badge removed. Audit log created. | P2 | |
| APPROVE-006 | REGD | Non-admin account | PATCH `/api/admin/profiles/{id}/approve` with non-admin JWT. | Returns 403 Forbidden. | P1 | |
| APPROVE-007 | ADMIN | None | GET `/api/admin/profiles/pending?page=1&pageSize=10`. | Returns paginated list of PendingReview profiles. | P1 | |
| APPROVE-008 | ADMIN | Approved profile | GET `/api/admin/profiles/{id}`. | Returns full profile detail including MongoDB document data. | P2 | |
| APPROVE-009 | ADMIN | Multiple actions taken | GET `/api/admin/audit-logs`. | Returns list of audit log entries with adminEmail, action, entityType, entityId, reason, createdAt. | P2 | |

---

## 8. Profile Search

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| SEARCH-001 | OWNER | At least 2 Active profiles of opposite gender exist | POST `/api/search` with `{}` (no filters). | Returns paginated list of Active, profileVisible profiles, excluding the caller's own profile. | P1 | |
| SEARCH-002 | OWNER | Multiple profiles exist | POST `/api/search` with `{ "gender": "Female", "minAge": 22, "maxAge": 30 }`. | Returns only female profiles aged 22–30. | P1 | |
| SEARCH-003 | OWNER | Profiles with different religions | POST `/api/search` with `{ "religion": "Islam" }`. | Returns only Islam profiles. | P2 | |
| SEARCH-004 | OWNER | Profiles in different districts | POST `/api/search` with `{ "division": "Dhaka", "district": "Dhaka" }`. | Returns only profiles matching location. | P2 | |
| SEARCH-005 | OWNER | Active profiles with different education levels | POST `/api/search` with `{ "minEducation": "Bachelor" }`. | Returns profiles with Bachelor or higher. | P2 | |
| SEARCH-006 | OWNER | None | POST `/api/search` with `{ "sortBy": "LastActive" }`. | Results ordered by `LastActiveAt` descending. | P2 | |
| SEARCH-007 | OWNER | None | POST `/api/search` with `{ "page": 1, "pageSize": 5 }`. | Returns max 5 results. `totalCount` and `totalPages` correct. | P1 | |
| SEARCH-008 | OWNER | Own profile is Active | POST `/api/search` without any filters. | Own profile does not appear in results. | P1 | |
| SEARCH-009 | OWNER | A Suspended profile exists | POST `/api/search`. | Suspended/Paused profiles do not appear in search results. | P1 | |
| SEARCH-010 | VISITOR | None | POST `/api/search` without Authorization header. | Returns 401. | P1 | |
| SEARCH-011 | OWNER | None | POST `/api/search` with `{ "minAge": 50, "maxAge": 20 }` (invalid range). | Returns 400 validation error or empty results gracefully. | P2 | |
| SEARCH-012 | OWNER | None | POST `/api/search` with `{ "pageSize": 200 }` (exceeds max). | Returns 400 or capped to max page size. | P3 | |

---

## 9. Profile Detail View

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| DETAIL-001 | OWNER | Another Active profile exists | GET `/api/profile/{userId}` (if endpoint exists) or navigate to `/profile/{userId}`. | Returns profile data. `fullName`, `phone`, `email` fields are hidden/masked unless unlocked. | P1 | |
| DETAIL-002 | OWNER | View an Active profile | `POST /api/profile/{userId}/view` fires automatically or is called from the detail page. | A `ProfileView` record is created. | P2 | |
| DETAIL-003 | OWNER | Viewed profile owner | GET `/api/profile/viewers`. | The viewing user appears in the viewers list. | P2 | |
| DETAIL-004 | VISITOR | None | Navigate to `/profile/{userId}` without auth. | Redirected to login, or profile data restricted. | P1 | |
| DETAIL-005 | OWNER | Viewing own profile | GET `/api/profile/me`. | Full profile returned including contact info. | P1 | |
| DETAIL-006 | OWNER | Viewing another user's profile with `profileVisible: false` | Attempt to view hidden profile. | Profile not returned (404 or excluded from results). | P1 | |
| DETAIL-007 | OWNER | Identity-verified profile | View the profile. | Verification badge visible in the response/UI. | P2 | |

---

## 10. Interest Requests

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| INT-001 | OWNER | Another Active profile exists | POST `/api/interests` with `{ "receiverId": "{otherUserId}" }`. | Interest created with `Status: Pending`. Notification sent to receiver. | P1 | |
| INT-002 | OWNER | Interest already sent to same user | POST `/api/interests` to the same `receiverId`. | Returns 409 — duplicate interest. | P1 | |
| INT-003 | OWNER | Interest sent | GET `/api/interests/sent`. | Returns the sent interest with `status: Pending`. | P1 | |
| INT-004 | OWNER (receiver) | Interest received | GET `/api/interests/received`. | Returns the pending interest. | P1 | |
| INT-005 | OWNER (receiver) | Pending interest received | PATCH `/api/interests/{id}/accept`. | Status → `Accepted`. Sender notified. Chat is now unlocked between the two users. | P1 | |
| INT-006 | OWNER (receiver) | Pending interest received | PATCH `/api/interests/{id}/reject`. | Status → `Rejected`. Sender notified. | P1 | |
| INT-007 | OWNER (sender) | Pending interest sent | DELETE `/api/interests/{id}`. | Interest cancelled. Removed from receiver's received list. | P2 | |
| INT-008 | OWNER | None | POST `/api/interests` with own userId as receiverId. | Returns 400 — self-interest not allowed. | P1 | |
| INT-009 | OWNER | Accepted interest exists | Verify `/api/chat/conversations/{userId}` is accessible. | Thread endpoint returns successfully (chat unlocked). | P1 | |
| INT-010 | OWNER | No accepted interest with user B | Attempt to send a message to user B via `POST /api/chat/conversations/{userBId}/messages`. | Returns 409 — chat not available without accepted interest. | P1 | |
| INT-011 | OWNER (receiver) | Accepted interest | PATCH `/api/interests/{id}/accept` again. | Returns 409 — cannot accept an already accepted interest. | P2 | |
| INT-012 | VISITOR | None | POST `/api/interests` without auth. | Returns 401. | P1 | |

---

## 11. Contact Unlock (Premium)

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| CONTACT-001 | OWNER | Viewing another Active profile | GET `/api/profile/{userId}/contact`. | Returns `{ isUnlocked: false }` (not yet unlocked). Phone/email not returned. | P1 | |
| CONTACT-002 | OWNER (non-premium) | Contact not unlocked | POST `/api/profile/{userId}/unlock-contact`. | Returns 403 — Premium membership required. | P1 | |
| CONTACT-003 | PREMIUM | Active membership | POST `/api/profile/{userId}/unlock-contact`. | Contact unlocked. Phone/email returned. `ContactUnlock` record created. | P1 | |
| CONTACT-004 | PREMIUM | Contact already unlocked for user B | POST `/api/profile/{userBId}/unlock-contact` again. | Idempotent — returns contact data without creating a second record. | P2 | |
| CONTACT-005 | PREMIUM | Contact unlocked | GET `/api/profile/{userId}/contact`. | Returns `{ isUnlocked: true, phone: "...", email: "..." }` or similar. | P1 | |
| CONTACT-006 | ADMIN | None | GET `/api/admin/contact-unlocks`. | Returns paginated audit list of all unlock events. | P2 | |
| CONTACT-007 | OWNER | No membership | Attempt to unlock contact for 3 different users. | All fail with 403 (no premium) — no unlock quota consumed. | P1 | |
| CONTACT-008 | VISITOR | None | POST `/api/profile/{userId}/unlock-contact` without auth. | Returns 401. | P1 | |

---

## 12. Saved Profiles (Shortlist)

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| SAVE-001 | OWNER | Another Active profile exists | POST `/api/saved/{userId}`. | Profile saved. Returns success. | P1 | |
| SAVE-002 | OWNER | Profile already saved | POST `/api/saved/{userId}` again. | Returns 409 — already saved, or idempotent success. | P2 | |
| SAVE-003 | OWNER | Profile saved | GET `/api/saved`. | Returns list containing the saved profile. | P1 | |
| SAVE-004 | OWNER | Profile saved | DELETE `/api/saved/{id}` using the saved-record ID from the list. | Profile removed from shortlist. | P1 | |
| SAVE-005 | OWNER | None | POST `/api/saved/{ownUserId}` (save self). | Returns 400 or 409. | P2 | |
| SAVE-006 | VISITOR | None | GET `/api/saved` without auth. | Returns 401. | P1 | |

---

## 13. Profile Reporting

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| PREPORT-001 | OWNER | Another Active profile exists | POST `/api/reports/{profileUserId}` with `{ "reason": "Fake", "description": "..." }`. | Report created with `Status: Active`. Confirmation response. | P1 | |
| PREPORT-002 | OWNER | Report already submitted for same profile | POST `/api/reports/{profileUserId}` again. | Returns 409 — duplicate report. | P2 | |
| PREPORT-003 | OWNER | None | POST `/api/reports/{ownUserId}` (report self). | Returns 400 — self-reporting not allowed. | P2 | |
| PREPORT-004 | VISITOR | None | POST `/api/reports/{userId}` without auth. | Returns 401. | P1 | |
| PREPORT-005 | OWNER | Report submitted | Navigate to dashboard or verify no public confirmation of report status visible. | Reporter cannot see admin's resolution from the user side. | P3 | |

---

## 14. Admin — Report Handling

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| AREPORT-001 | ADMIN | Active reports exist | GET `/api/admin/reports?status=Active`. | Returns paginated list of active profile reports. | P1 | |
| AREPORT-002 | ADMIN | Active report exists | PATCH `/api/admin/reports/{id}/dismiss`. | Report status → `Dismissed`. Audit log created. | P1 | |
| AREPORT-003 | ADMIN | Active report exists | PATCH `/api/admin/reports/{id}/suspend` with `{ "reason": "..." }`. | Reported profile suspended + report dismissed. Audit log created. | P1 | |
| AREPORT-004 | REGD | Non-admin | GET `/api/admin/reports`. | Returns 403 Forbidden. | P1 | |
| AREPORT-005 | ADMIN | Dismissed report | PATCH `/api/admin/reports/{id}/dismiss` again (idempotency). | Returns 204 or 200 — no error on re-dismiss. | P3 | |

---

## 15. Notifications

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| NOTIF-001 | OWNER | Interest sent to user B | Log in as user B. GET `/api/notifications`. | At least one notification of type `InterestReceived` is present. | P1 | |
| NOTIF-002 | OWNER | Interest accepted by user B | Log in as the sender. GET `/api/notifications`. | Notification of type `InterestAccepted` is present. | P1 | |
| NOTIF-003 | OWNER | Interest rejected | Log in as the sender. GET `/api/notifications`. | Notification of type `InterestRejected` is present. | P2 | |
| NOTIF-004 | OWNER | Message received in chat | GET `/api/notifications`. | Notification of type `NewMessage` is present. | P1 | |
| NOTIF-005 | OWNER | Unread notifications exist | GET `/api/notifications/unread-count`. | Returns `{ count: N }` where N > 0. | P1 | |
| NOTIF-006 | OWNER | Unread notification exists | PATCH `/api/notifications/{id}/read`. | Notification `isRead` becomes `true`. Unread count decrements. | P1 | |
| NOTIF-007 | OWNER | Multiple unread notifications | PATCH `/api/notifications/read-all`. | All notifications marked as read. `unread-count` returns 0. | P2 | |
| NOTIF-008 | OWNER | Pagination test | GET `/api/notifications?page=1&pageSize=5`. | Returns max 5 items. `totalCount` reflects actual count. | P2 | |

---

## 16. Chat — Messaging

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| CHAT-001 | OWNER | Accepted interest exists with user B | POST `/api/chat/conversations/{userBId}/messages` with `{ "body": "Hello!" }`. | Returns 201. Message created. Conversation created if first message. | P1 | |
| CHAT-002 | OWNER | No accepted interest with user C | POST `/api/chat/conversations/{userCId}/messages`. | Returns 409 — chat requires accepted interest. | P1 | |
| CHAT-003 | OWNER | Conversation exists | GET `/api/chat/conversations/{userBId}?page=1&pageSize=50`. | Returns thread with messages in chronological order. `isBlocked`, `isClosed` fields present. | P1 | |
| CHAT-004 | OWNER | Conversation exists | GET `/api/chat/conversations`. | Returns list of conversations with `unreadCount`, `lastMessage`, `isBlocked`, `isClosed`. | P1 | |
| CHAT-005 | OWNER | Messages received | PATCH `/api/chat/conversations/{userBId}/read`. | MessageRead records created. Unread count for this conversation drops to 0. | P1 | |
| CHAT-006 | OWNER | Message sent by user A | Log in as user B. Verify `GET /api/chat/unread-count` is > 0. After marking read, verify it returns 0. | Unread count accurate. | P1 | |
| CHAT-007 | OWNER | Active conversation | POST `/api/chat/users/{userBId}/block`. | Block created. Subsequent `sendMessage` from either side returns 409. `isBlocked: true` in thread response. | P1 | |
| CHAT-008 | OWNER | User B blocked | POST `/api/chat/users/{userBId}/block` again. | Idempotent — no error. | P2 | |
| CHAT-009 | OWNER | User B blocked | DELETE `/api/chat/users/{userBId}/block`. | Block removed. Messaging re-enabled. | P1 | |
| CHAT-010 | OWNER | None | POST `/api/chat/conversations/{ownUserId}/messages`. | Returns 400 — cannot chat with self. | P1 | |
| CHAT-011 | OWNER | Active conversation | Send 21 messages within 1 minute. | 21st message returns 429 (rate limit). Earlier messages succeed. | P2 | |
| CHAT-012 | OWNER | Banned words configured in appsettings | Send a message containing a banned word. | Returns 400 with "prohibited content" error. Message not saved. | P2 | |
| CHAT-013 | OWNER | Suspended user account | Attempt to send a message while account is suspended. | Returns 401 — account not active. | P1 | |
| CHAT-014 | VISITOR | None | POST `/api/chat/conversations/{userId}/messages` without auth. | Returns 401. | P1 | |
| CHAT-015 | OWNER | Read receipts | Send a message as user A. Log in as user B and fetch thread. `isRead` should be `false`. Mark read. Re-fetch as user A — message shows `isRead: true` (✓✓). | Read receipt logic correct. | P2 | |

---

## 17. Chat — Safety & Moderation

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| MOD-001 | OWNER | Message received from user B | POST `/api/chat/messages/{messageId}/report` with `{ "reason": "Harassment" }`. | Report created. Returns 204. | P1 | |
| MOD-002 | OWNER | Message already reported by same user | POST `/api/chat/messages/{messageId}/report` again. | Idempotent — returns 204, no duplicate created. | P2 | |
| MOD-003 | OWNER | Own message | POST `/api/chat/messages/{ownMessageId}/report`. | Returns 400 — cannot report own message. | P1 | |
| MOD-004 | OWNER | Message not in any of user's conversations | POST `/api/chat/messages/{foreignMessageId}/report`. | Returns 401 — not a participant. | P1 | |
| MOD-005 | ADMIN | Message reports exist | GET `/api/admin/chat/reports?status=Open`. | Returns list of open reports with `messageBody`, `reporterName`, `senderName`, `reason`, `isConversationClosed`. | P1 | |
| MOD-006 | ADMIN | Open report exists | PATCH `/api/admin/chat/reports/{id}/dismiss`. | Report status → `Dismissed`. Audit log created. | P1 | |
| MOD-007 | ADMIN | Open report exists | POST `/api/admin/chat/conversations/{convId}/close`. | `IsClosed = true` on conversation. Both users see `isClosed: true` in thread. Sending messages returns 409. | P1 | |
| MOD-008 | ADMIN | Conversation already closed | POST `/api/admin/chat/conversations/{convId}/close` again. | Idempotent — returns 204. | P2 | |
| MOD-009 | REGD | Non-admin | GET `/api/admin/chat/reports`. | Returns 403. | P1 | |
| MOD-010 | OWNER | Closed conversation | Verify thread response includes `isClosed: true`. Verify send textarea is disabled in UI at `/chat/{userId}`. | UI correctly reflects closed state. | P1 | |

---

## 18. Membership Plans

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| MEMBER-001 | VISITOR | None | GET `/api/membership/plans`. | Returns list of available plans (name, price, duration, features). No auth required. | P1 | |
| MEMBER-002 | OWNER | No active membership | GET `/api/membership/me`. | Returns membership info with `plan: Free` or equivalent. Usage limits for contact unlocks shown. | P1 | |
| MEMBER-003 | PREMIUM | Active membership | GET `/api/membership/me`. | Returns `plan: Silver/Gold`, `expiresAt` in future. `isPremiumMember: true` in ProfileIndex. | P1 | |
| MEMBER-004 | VISITOR | None | GET `/api/membership/me` without auth. | Returns 401. | P1 | |

---

## 19. Orders & Payment

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| ORDER-001 | OWNER | None | POST `/api/orders` with `{ "plan": "Silver" }`. | Order created with `Status: Pending`. Returns order ID. | P1 | |
| ORDER-002 | OWNER | Order created | GET `/api/orders/me`. | Returns list including the new order. | P1 | |
| ORDER-003 | OWNER | Pending order exists | POST `/api/orders/{orderId}/submit-payment` with `{ "gatewayName": "bKash", "gatewayTransactionId": "TXN123", "amountBdt": 500 }`. | PaymentAttempt created with `Status: Pending`. Admin can now see it. | P1 | |
| ORDER-004 | OWNER | Payment submitted | POST `/api/orders/{orderId}/submit-payment` again with same transaction ID. | Returns 409 — duplicate transaction ID. | P1 | |
| ORDER-005 | ADMIN | Payment attempt in Pending state | PATCH `/api/admin/payment-attempts/{id}/verify`. | PaymentAttempt → `Completed`. Membership activated for user. `isPremiumMember: true`. Audit log created. | P1 | |
| ORDER-006 | ADMIN | Payment attempt in Pending state | PATCH `/api/admin/payment-attempts/{id}/reject` with reason. | PaymentAttempt → `Failed`. User can resubmit. Audit log created. | P1 | |
| ORDER-007 | ADMIN | None | GET `/api/admin/payment-attempts?status=Pending`. | Returns paginated list. | P1 | |
| ORDER-008 | REGD | Non-admin | PATCH `/api/admin/payment-attempts/{id}/verify`. | Returns 403. | P1 | |
| ORDER-009 | OWNER | None | POST `/api/orders` with `{ "plan": "InvalidPlan" }`. | Returns 400 validation error. | P2 | |
| ORDER-010 | VISITOR | None | POST `/api/orders` without auth. | Returns 401. | P1 | |

---

## 20. Support Tickets

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| SUP-001 | OWNER | None | POST `/api/support` with `{ "subject": "Issue", "category": "Technical", "body": "..." }`. | Ticket created with `Status: Open`. | P1 | |
| SUP-002 | OWNER | Ticket created | GET `/api/support`. | Returns list including the new ticket. | P1 | |
| SUP-003 | OWNER | Ticket created | GET `/api/support/{id}`. | Returns full ticket detail including messages. | P1 | |
| SUP-004 | OWNER | Ticket open | POST `/api/support/{id}/messages` with `{ "body": "Follow-up" }`. | Message added to ticket. `UpdatedAt` refreshed. | P1 | |
| SUP-005 | ADMIN | Open ticket exists | GET `/api/admin/support`. | Returns all tickets across users. | P1 | |
| SUP-006 | ADMIN | Open ticket | POST `/api/admin/support/{id}/messages` with `{ "body": "Staff reply", "isStaff": true }`. | Staff message added. User can see the reply. | P1 | |
| SUP-007 | ADMIN | Open ticket | PATCH `/api/admin/support/{id}/status` with `{ "status": "Resolved" }`. | Ticket status → `Resolved`. | P1 | |
| SUP-008 | VISITOR | None | POST `/api/support` without auth. | Returns 401. | P1 | |
| SUP-009 | OWNER | Ticket closed | POST `/api/support/{id}/messages` (add message to closed ticket). | Returns 409 — ticket is closed. (Verify this behavior.) | P2 | |

---

## 21. AI Match Recommendations

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| MATCH-001 | OWNER | Active profile, at least 5 other Active profiles of opposite gender exist | GET `/api/matches/recommended`. | Returns up to 20 matches with `score`, `matchLevel`, `matchReasons`. Results ordered by score descending. | P1 | |
| MATCH-002 | OWNER | `Anthropic:ApiKey` is blank in config | GET `/api/matches/recommended`. | Returns matches. `aiExplanation` is a fallback text generated from match reasons (not null). | P2 | |
| MATCH-003 | OWNER | `Anthropic:ApiKey` is valid | GET `/api/matches/recommended`. | `aiExplanation` field contains an AI-generated sentence for each match. | P2 | |
| MATCH-004 | OWNER | Matches already scored | GET `/api/matches/recommended` again without `?refresh=true`. | Returns same cached matches (24h cache). `aiExplanation` not re-generated. | P2 | |
| MATCH-005 | OWNER | None | GET `/api/matches/recommended?refresh=true`. | Forces re-scoring. New `ScoredAt` timestamp. | P3 | |
| MATCH-006 | VISITOR | None | GET `/api/matches/recommended` without auth. | Returns 401. | P1 | |

---

## 22. Health Check Endpoints

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| HEALTH-001 | VISITOR | API running | GET `/health`. | Returns 200 with `{ status: "Healthy" }`. No DB queries required (liveness only). | P1 | |
| HEALTH-002 | VISITOR | PostgreSQL connected | GET `/health/ready`. | Returns 200 with status for both `postgres` and `mongodb` checks as Healthy. | P1 | |
| HEALTH-003 | VISITOR | PostgreSQL unavailable (simulate) | Stop the Postgres container. GET `/health/ready`. | Returns 503 Service Unavailable. Response body shows which check failed. | P2 | |
| HEALTH-004 | VISITOR | None | GET `/health` and `/health/ready` 100 times rapidly. | Both endpoints bypass rate limiting — all 100 requests return 200. | P2 | |

---

## 23. Security Checks

| Test ID | Role | Precondition | Steps | Expected Result | Priority | Status |
|---------|------|-------------|-------|----------------|----------|--------|
| SEC-001 | VISITOR | None | Send any authenticated endpoint request with no `Authorization` header. | Returns 401. | P1 | |
| SEC-002 | OWNER | Valid JWT for user A | Modify the JWT payload (e.g., change `sub` to user B's ID) without re-signing. | Returns 401 — invalid signature. | P1 | |
| SEC-003 | REGD | Non-admin account | Call any `GET /api/admin/*` endpoint with a user-role JWT. | Returns 403 Forbidden. | P1 | |
| SEC-004 | OWNER | Two separate users A and B | User A sends `GET /api/profile/me` with user B's JWT. | Endpoint is keyed to JWT sub — user B's data returned, not user A's. (Each user only sees their own data.) | P1 | |
| SEC-005 | OWNER | User A has interest request ID for user B | User A attempts to accept/reject user B's interest by sending PATCH with user B's interest ID. | Returns 403 — user A is not the receiver of this interest. | P1 | |
| SEC-006 | OWNER | User A has saved-profile record ID | User A attempts `DELETE /api/saved/{idOwnedByUserB}`. | Returns 403 or 404 — cannot delete another user's saved profile. | P1 | |
| SEC-007 | VISITOR | None | POST `/api/auth/register` 11 times from the same IP within 1 minute. | 11th request returns 429 Too Many Requests. | P1 | |
| SEC-008 | OWNER | Profile with contact info | Fetch a profile detail response as another user without unlocking contact. | `phone`, `email`, `fullName` fields are absent or masked in the response. | P1 | |
| SEC-009 | OWNER | None | Submit a message body with a 1001-character string. | Returns 400 — body exceeds max 1000 chars. | P2 | |
| SEC-010 | OWNER | None | Include `<script>alert(1)</script>` in a profile `aboutMe` text field. | String stored as-is but rendered safely in the UI (HTML-encoded or text node). No XSS execution. | P1 | |
| SEC-011 | VISITOR | None | Call `GET /health` and `GET /health/ready` without auth. | Returns 200. Endpoints are publicly accessible (no auth required by design). | P2 | |
| SEC-012 | OWNER | Expired access token | Send a request with an `accessToken` that has passed its expiry time. | Returns 401. Must use refresh token to get a new access token. | P1 | |
| SEC-013 | OWNER | Logged out | Use the `refreshToken` that was active before logout. | Returns 401 — token was revoked on logout. | P1 | |
| SEC-014 | OWNER | None | Send `POST /api/profile/submit` from user A using user B's profile ID (if the endpoint accepts an ID). | Endpoint is keyed to the JWT subject — only the authenticated user's profile can be submitted. | P1 | |
| SEC-015 | REGD | Non-admin | POST `/api/admin/chat/conversations/{convId}/close`. | Returns 403. | P1 | |

---

## Appendix A — Test Environment Setup

1. Start PostgreSQL and MongoDB (e.g., via `docker-compose up`).
2. Set environment variables: `ConnectionStrings__Postgres`, `MongoDB__ConnectionString`, `Jwt__Secret` (≥32 chars).
3. Start the API: `dotnet run` (auto-migrates in development).
4. Start the web app: `npm run dev` at `http://localhost:3000`.
5. Use the browser or a REST client (e.g., Postman, curl) for API-level tests.
6. For admin tests, seed an admin user directly in the database (`Role = 'Admin'`).

---

## Appendix B — Test Data Suggestions

| User Type | Email | Password | Notes |
|-----------|-------|----------|-------|
| Admin | `admin@test.bd` | `Admin1234!` | Set `Role = 'Admin'` in DB |
| Male profile | `male1@test.bd` | `Test1234!` | Complete profile, approved |
| Female profile | `female1@test.bd` | `Test1234!` | Complete profile, approved |
| Unverified | `unverified@test.bd` | `Test1234!` | Email not verified |
| Premium user | `premium@test.bd` | `Test1234!` | Active Silver/Gold membership |

---

*End of Manual Test Plan v1*
