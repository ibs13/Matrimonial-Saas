# Security and Privacy

## Privacy-First Design

The platform handles sensitive personal information. Key decisions made at the architecture level:

### PII Hidden by Default

Full name, phone number, present address, and guardian phone are never shown to other users unless the owner has explicitly opted in. The default `Visibility` object on every new profile is:

```json
{
  "ShowFullName": false,
  "ShowPhone": false,
  "ShowAddress": false,
  "ProfileVisible": true
}
```

These fields exist only in MongoDB. They are never written to the PostgreSQL search index. A user searching profiles sees only `DisplayName`, `Gender`, `Age`, `Religion`, `Location` (division/district), and the approved photo.

### Contact Information Gated Behind Two Conditions

Phone and address are revealed only when both:
1. The two users have an accepted interest request (mutual connection established)
2. The viewing user has performed a `ContactUnlock` (premium feature, one-time per pair)

The unlock is tracked in `ContactUnlocks` (PostgreSQL) and auditable by admins.

### No PII in Match Explainer Prompts

When generating AI match explanations via the Anthropic API, the prompt contains only non-identifying profile attributes: age range, religion, education level, location (division-level only), career type. Full names, photos, and contact details are never sent to any external API.

---

## Password Security

All passwords are hashed using **BCrypt** (BCrypt.Net-Next 4.0.3) with a work factor of 11. BCrypt is intentionally slow and salted — it is resistant to rainbow table and brute-force attacks.

The raw password is never stored, logged, or passed between services. The `PasswordHash` column in `Users` contains only the BCrypt output string.

---

## Token Security

### Access Token (JWT)

- Algorithm: HMAC-SHA256 (symmetric, using `JWT_SECRET`)
- Expiry: 60 minutes (configurable via `JWT_EXPIRY_MINUTES`)
- Claims: user ID, email, role only — no sensitive data
- Validated with zero clock skew — an expired token is always rejected

The JWT secret must be at least 32 characters. The API calls `throw` at startup if the secret is too short:

```csharp
if (jwtSecret.Length < 32)
    throw new InvalidOperationException("JWT_SECRET must be at least 32 characters.");
```

### Refresh Token

- Generated as 64 cryptographically random bytes, base64url-encoded
- Stored in the database as `SHA256(raw token)` — the raw value is never persisted
- Has its own expiry (7 days) and a revocation flag (`IsRevoked`)
- On refresh: the old token is revoked and a new pair is issued (rotation)
- On logout: the token is revoked — the session cannot be extended

---

## Email Verification Tokens

Verification tokens follow the same hash-before-store pattern:
- Raw token: 64 cryptographically random bytes, base64url-encoded
- DB stores: `SHA256(raw token)` — collision-resistant, cannot be reversed
- The link emailed to the user contains the raw token as a query parameter
- Tokens expire after a fixed duration
- Once used (`UsedAt` set), the token cannot be used again (one-time)

---

## Rate Limiting

### Auth Endpoints

ASP.NET Core's built-in rate limiter is applied to all `/api/auth/*` routes:

- Policy: **fixed window**, 10 requests per IP per minute
- Response when exceeded: `429 Too Many Requests`
- Purpose: mitigates brute-force login attempts

### Chat Messages

Per-user rate limiting in the `ChatService`:

- Policy: **sliding window**, configurable max messages per minute (default 20)
- Implementation: `IMemoryCache` with key `chat_rate:{userId}:{yyyyMMddHHmm}`
- Resets on API restart (in-memory only)
- Configurable via `Chat:RateLimit:MaxMessagesPerMinute` in `appsettings.json`

---

## Authorization Model

Two roles exist in the system:

| Role | Access |
|------|--------|
| `User` | Own profile, search, chat, interests, notifications, billing, support |
| `Admin` | Everything a User can do plus the `/api/admin/*` namespace |

Authorization policies:

```csharp
builder.Services.AddAuthorization(options => {
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    options.AddPolicy("UserOrAdmin", p => p.RequireAuthenticatedUser());
});
```

Endpoints use `[Authorize(Policy = "AdminOnly")]` or `[Authorize]`. There is no row-level security framework — controllers and services are responsible for checking that the current user owns the resource they are modifying.

Pattern used throughout the service layer:
```csharp
if (entity.OwnerId != currentUserId)
    throw new UnauthorizedAccessException("Access denied.");
```

---

## Content Moderation

### Banned Word Filter

The `BannedWordFilterService` (singleton) holds a case-insensitive word list loaded from `Chat:BannedWords` in configuration. Every chat message body is checked before save. If a banned word is found, the message is rejected with a `400 Bad Request`.

The list is empty by default and must be configured by the operator.

### Admin Moderation

Admins can:
- **Suspend** a profile (sets `Status = Suspended` in both MongoDB and PostgreSQL)
- **Reject** a profile during review (sets `Status = Draft`, returns to owner with reason)
- **Approve or reject photos** before they appear in search results
- **Dismiss profile reports** from users
- **Close conversations** (sets `IsClosed = true`, disables further messaging)
- **Dismiss chat message reports**

All admin actions are recorded in `AuditLogs` with: AdminId, AdminEmail, Action, EntityType, EntityId, optional Reason, and timestamp. The table has no FK to `Users`, so logs survive admin account deletion.

### User Reporting

Users can report:
- **Profiles** (`POST /api/reports/profiles/{userId}`) — reasons: Fake, Inappropriate, Spam, Other
- **Chat messages** (`POST /api/chat/messages/{messageId}/report`) — with a reason (max 300 chars)

Reports are idempotent — a user cannot submit the same report twice for the same target.

---

## Data Access Controls Summary

| Data | Visible To | Condition |
|------|-----------|-----------|
| Search index fields | Any authenticated user | Profile is Active + ProfileVisible |
| Full name | Authenticated user | Owner toggled `ShowFullName` |
| Phone / address | Connection only | Accepted interest + ContactUnlock |
| Photos (Public) | Any authenticated user | Admin approved the photo |
| Photos (Private) | Owner only | Always |
| Contact details (admin) | Admin | Any time via admin profile detail |
| Audit logs | Admin only | Any time |
| Another user's messages | Admin only | Via moderation queue (not bulk) |

---

## HTTPS / HSTS

In production, the API enforces:
- **HTTP → HTTPS redirect** via `app.UseHttpsRedirection()`
- **HSTS** via `app.UseHsts()` with `MaxAge = 365 days`, `includeSubDomains = true`

In development these are disabled to allow plain HTTP on localhost.

---

## Dependency Security

- `BCrypt.Net-Next` — well-maintained, audited library for password hashing
- `Microsoft.AspNetCore.Authentication.JwtBearer` — Microsoft-maintained, part of ASP.NET Core
- `Npgsql.EntityFrameworkCore.PostgreSQL` — all queries go through EF Core parameterized queries; SQL injection is not possible via EF LINQ
- MongoDB LINQ queries use the official driver with parameterized filters; no raw MongoDB command injection surface

---

## Known Security Gaps (v1)

These are known limitations that should be addressed before a high-traffic public launch:

1. **No password reset flow** — users who forget their password cannot recover their account without admin intervention.
2. **In-memory rate limiting** — the chat rate limiter uses `IMemoryCache`. If the API runs on multiple instances, the per-user limit is not shared across instances. Replace with Redis for multi-instance deployments.
3. **Photo storage on local disk** — photos stored locally are lost if the container is replaced. Use object storage (S3, R2) in production.
4. **No CSRF protection** — the API is stateless (JWT), so CSRF is not a risk for the API itself. If cookies are ever used for auth, add CSRF tokens.
5. **No account lockout** — there is no progressive delay or lockout after repeated failed login attempts (only rate limiting by IP).
