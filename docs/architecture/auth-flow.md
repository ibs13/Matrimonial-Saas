# Authentication and Authorization Flow

## Token Architecture

The API uses a two-token system:

| Token | Lifetime | Storage | Purpose |
|-------|---------|---------|---------|
| Access token (JWT) | 60 minutes | `localStorage` | Sent as `Authorization: Bearer` on every API request |
| Refresh token | 7 days | `localStorage` + `RefreshTokens` DB table | Exchanges for a new access token when the current one expires |

Access tokens are stateless JWTs — the server validates the signature and claims without a database lookup. Refresh tokens are stateful — each one is recorded in the database and can be revoked on logout or suspicious activity.

---

## Registration Flow

```
1. POST /api/auth/register { email, password }
   │
   ├─ Validate: email format, password complexity
   ├─ Normalize: email.ToLower().Trim()
   ├─ Check: email not already registered
   ├─ Hash: BCrypt.HashPassword(password, workFactor: 11)
   ├─ Create: Users row (Role=User, IsEmailVerified=false)
   ├─ Create: UserMembership row (Plan=Free)
   ├─ Issue: access token + refresh token
   ├─ Send: verification email (or log to console in dev)
   └─ Return: { accessToken, refreshToken, role, isEmailVerified: false }
```

---

## Login Flow

```
1. POST /api/auth/login { email, password }
   │
   ├─ Normalize: email.ToLower().Trim()
   ├─ Find: Users row by normalized email
   ├─ Check: user.IsActive == true
   ├─ Verify: BCrypt.Verify(password, user.PasswordHash)
   ├─ Issue: access token + refresh token
   └─ Return: { accessToken, refreshToken, role, isEmailVerified }
```

Rate limit: **10 requests per IP per minute** on all `/api/auth/*` endpoints.

---

## Token Refresh Flow

The frontend axios interceptor automatically refreshes the access token when it receives a `401 Unauthorized`:

```
Client sends:  GET /api/profile/me
               Authorization: Bearer <expired_access_token>

Server returns: 401 Unauthorized

Interceptor:   POST /api/auth/refresh { refreshToken }
               │
               ├─ Find: RefreshToken row by hashed value
               ├─ Check: not expired, not revoked
               ├─ Revoke: old refresh token (IsRevoked = true)
               ├─ Issue: new access token + new refresh token
               └─ Return: { accessToken, refreshToken }

Interceptor:   Saves new tokens to localStorage
               Retries original request with new access token
```

If the refresh token is also expired or revoked, the interceptor clears localStorage and redirects to `/login`.

---

## Logout Flow

```
1. POST /api/auth/logout { refreshToken }
   │
   ├─ Find: RefreshToken row
   ├─ Set: IsRevoked = true
   └─ Return: 204 No Content

2. Frontend: clears localStorage (accessToken, refreshToken)
             redirects to /login
```

---

## Email Verification Flow

```
1. On register: API generates a random 64-byte token
                Stores SHA256(token) in EmailVerificationTokens
                Emails (or logs) "Click here: /verify-email?token=<raw>"

2. User clicks link: GET /api/auth/verify-email?token=<raw>
   │
   ├─ Hash: SHA256(raw token)
   ├─ Find: EmailVerificationTokens row by TokenHash
   ├─ Check: not used (UsedAt == null), not expired
   ├─ Set: token.UsedAt = now
   ├─ Set: user.IsEmailVerified = true
   ├─ Update: ProfileIndex.IsEmailVerified = true
   └─ Redirect: /verify-email (success page)

3. POST /api/auth/resend-verification [Authorize]
   ├─ Invalidate: existing unused tokens for this user
   ├─ Generate: new token
   └─ Send: new verification email
```

Email verification is not strictly required to use the platform, but it:
- Unlocks the `IsEmailVerified` badge shown on the profile
- Is required for the identity verification badge

---

## JWT Claims

Every access token contains:

| Claim | Value |
|-------|-------|
| `sub` (NameIdentifier) | `User.Id` (GUID) |
| `email` | `User.Email` |
| `role` | `User` or `Admin` |
| `iss` | `JWT_ISSUER` config value |
| `aud` | `JWT_AUDIENCE` config value |
| `exp` | Expiry timestamp |
| `iat` | Issued at timestamp |

Controllers extract the current user ID with:
```csharp
protected Guid CurrentUserId =>
    Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
```

---

## Authorization Policies

Two policies are defined in `Program.cs`:

**`AdminOnly`** — requires `Role == "Admin"`:
```csharp
[Authorize(Policy = "AdminOnly")]
```
Used on all `/api/admin/*` controllers.

**`UserOrAdmin`** — requires any authenticated user:
```csharp
[Authorize(Policy = "UserOrAdmin")]
```
Used when an endpoint needs to allow both regular users and admins (e.g., support tickets).

Standard `[Authorize]` (no policy) allows any authenticated user regardless of role.

---

## Auth Context (Frontend)

`AuthContext` (`web/src/contexts/AuthContext.tsx`) manages global auth state in React:

```typescript
interface AuthContextType {
  user: MeResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  login(email, password): Promise<void>;
  register(email, password): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}
```

On mount, `AuthContext` calls `GET /api/auth/me` to hydrate the user state from the stored access token. If the token is missing or invalid, the user is redirected to `/login` by the route protection logic in the `(main)` layout.

---

## Security Notes

- Passwords are never stored in plaintext or reversibly encoded.
- The JWT secret must be at least 32 characters. The API fails fast at startup if it is missing or too short.
- Refresh tokens are stored as SHA256 hashes — the raw token is never persisted.
- There is no "forgot password" flow in v1. This must be implemented before production launch if required.
- Auth rate limiting (10 req/min per IP) mitigates brute-force attacks on the login endpoint.
