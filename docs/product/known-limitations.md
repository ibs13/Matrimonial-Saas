# Known Limitations

This document describes current limitations, edge cases, and technical trade-offs in v1. These are known issues, not bugs — they are understood constraints of the current design.

---

## Authentication

### No Password Reset

There is no self-service password reset flow. A user who forgets their password cannot recover their account without admin intervention.

**Workaround:** Admin can reset a password by running:
```sql
UPDATE "Users"
SET "PasswordHash" = '<new_bcrypt_hash>'
WHERE "Email" = 'user@example.com';
```
Generate the hash with BCrypt work factor 11 using any BCrypt tool.

**Fix:** Implement the password reset token flow (see `docs/product/roadmap.md`).

---

### No Account Lockout After Failed Logins

Repeated failed login attempts are throttled by IP rate limiting (10 req/min) but there is no per-account lockout. A distributed attack from many IPs could brute-force a weak password.

**Mitigation:** Enforce strong password requirements and use IP-level rate limiting.

---

### All Sessions Invalidated on JWT Secret Rotation

If `JWT_SECRET` is changed (e.g., after a suspected compromise), all existing access tokens are immediately invalid. Users will receive 401 on their next API call and be redirected to login. This is the correct security behavior but is disruptive.

Refresh tokens are stored in the database and remain valid until their expiry; however, they cannot produce a new access token if the signature key changed. All sessions effectively end.

---

## Profile

### No Re-Review Required After Editing an Active Profile

When an Active profile is edited, the changes are saved immediately to MongoDB and PostgreSQL without triggering a new review cycle. An admin has no automatic visibility into what changed.

This means a user could edit their profile to add inappropriate content after approval.

**Mitigation:** Admins can manually re-review any profile. Profile reports from other users are the primary detection mechanism.

---

### Single Photo Per Profile

Only one photo is supported. Users who want to upload a new photo must delete the old one first. If the new photo is rejected, they have no photo until they upload another.

---

### Photo Files Not Deleted from Disk on Removal

When a photo is deleted via `DELETE /api/profile/photo`, the physical file in `wwwroot/photos/` is not removed in the current `LocalDiskPhotoStorage` implementation. Over time, orphaned files accumulate.

**Workaround in dev:** Periodically clean up `wwwroot/photos/` manually.

**Fix:** `LocalDiskPhotoStorage.DeleteAsync` should call `File.Delete(path)`.

---

### No Profile Deactivation by Users

Users cannot deactivate their own profile. Setting `profileVisible = false` hides it from search but the profile remains Active. There is no way for a user to fully pause their profile while keeping their account.

**Workaround:** User contacts support, admin suspends the profile (which has admin connotations that deactivation should not).

---

## Search

### Search Index Can Drift from MongoDB

The `ProfileIndexes` (PostgreSQL) table is updated synchronously with every profile save. However, if a profile update fails halfway through (e.g., MongoDB write succeeds but PostgreSQL update fails), the two databases can diverge.

There is no reconciliation job or consistency check in v1.

**Mitigation:** EF Core and MongoDB writes happen in the same request, and exceptions roll back the context. Partial failures are uncommon.

**Full fix:** Wrap both writes in an outbox pattern or add a background reconciliation job.

---

### Hobbies Not Searchable

The `Lifestyle.Hobbies` array is stored only in MongoDB, not in the PostgreSQL search index. Users cannot filter by hobbies.

---

## Interest Requests

### Monthly Limit Counts Cancelled Requests

When a user sends an interest and then cancels it, the cancelled request still counts toward their monthly limit. This is intentional to prevent gaming the limit, but may frustrate users who cancel by mistake.

---

### No Re-Interest After Rejection

After an interest is rejected, the system prevents a new `Pending` request while the rejected request exists in the same period. The UI shows "Already sent" even though the request was rejected.

The logic checks for any non-expired request between the two users in either direction. A Rejected request clears the way for re-sending only after its `SentAt` date falls outside the current month window.

---

## Chat

### Rate Limit Resets on API Restart

The chat rate limiter uses `IMemoryCache`. If the API container restarts (e.g., during a deployment), the per-user message counters reset, allowing a burst of messages immediately after restart.

**Fix:** Use Redis-backed rate limiting for production deployments.

---

### Rate Limit Not Shared Across Multiple API Instances

If the API runs on more than one instance (horizontal scaling), each instance maintains its own `IMemoryCache`. A user can send up to `MaxMessagesPerMinute` messages per instance, effectively multiplying the rate limit.

**Fix:** Use Redis-backed distributed caching for the rate limit keys.

---

### No Message Editing or Deletion by Users

Messages cannot be edited or deleted by the sender. Only admins can act on messages (via the moderation system).

---

### Conversation Closure Is Permanent

Once an admin closes a conversation, it cannot be reopened. There is no reopen endpoint. If an admin closes a conversation by mistake, the only recourse is to create a new connection (which requires a new interest request).

---

## Payments

### Manual Payment Verification Latency

All payments require admin review. Users may wait hours or days for membership activation after submitting payment proof. This is a v1 constraint pending automated payment gateway integration.

---

### No Refund Flow

There is no refund mechanism. If a user is charged incorrectly, it must be handled manually outside the system.

---

## Notifications

### No Email Notifications

Notifications are in-app only. There are no email digests, transactional emails for interests received, or reminders for unread messages.

**Exception:** Email verification sends one email. All other notifications are in-app only.

---

### Notifications Are Not Real-Time

Notifications appear on the next page load or when the user navigates to `/notifications`. There is no push mechanism or WebSocket in v1.

The unread count badge in the navbar polls every 60 seconds — new notifications are visible within a minute.

---

## Infrastructure

### In-Memory Chat Rate Limiting (Scaling)

See Chat section above. Single instance only in v1.

---

### No Background Job System

The following operations that should run on a schedule do not run automatically:

| Task | Impact | Workaround |
|------|--------|-----------|
| Clean up expired email verification tokens | `EmailVerificationTokens` table grows indefinitely | Manual SQL: `DELETE FROM "EmailVerificationTokens" WHERE "ExpiresAt" < now()` |
| Clean up expired refresh tokens | `RefreshTokens` table grows | Manual SQL: `DELETE FROM "RefreshTokens" WHERE "ExpiresAt" < now()` |
| Re-score profile matches | Matches go stale if profiles update | User triggers manually via `/api/matches/recommended?refresh=true` |
| Clean orphaned photo files | Disk fills up slowly | Manual `wwwroot/photos/` cleanup |

---

### Photos Stored on Local Disk

In the current development configuration, photos are stored on the API container's filesystem. If the container is replaced (e.g., during a rolling update), all photos are lost.

**Fix before production:** Switch to `S3PhotoStorage` or equivalent cloud storage implementation.

---

### Swagger Enabled in All Environments

Swagger UI is currently available at `/swagger` in all environments, including production. This is a low-risk information disclosure (exposes API structure) but should be restricted in production.

**Fix:** Add `if (app.Environment.IsDevelopment())` guard around `app.UseSwagger()`.
