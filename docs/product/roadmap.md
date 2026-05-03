# Product Roadmap

This document describes suggested features for v2 and beyond. Items are organized by theme and rough priority. This is a starting point for planning, not a commitment.

---

## High Priority (Next Release)

### Password Reset

**Why:** Users who forget their password currently have no self-service recovery path. An admin must manually reset it.

**What to build:**
1. `POST /api/auth/forgot-password` — accepts email, sends a reset link
2. Token flow identical to email verification (hash-before-store, one-time use)
3. `POST /api/auth/reset-password` — accepts token + new password
4. Frontend pages: `/forgot-password`, `/reset-password`

**Dependencies:** Requires a production email sender to be configured.

---

### Automated Payment Gateway Integration

**Why:** Manual payment verification does not scale. Users wait hours or days for activation.

**What to build:**
1. Payment gateway webhook handlers for SSLCommerz, bKash, or Nagad
2. Idempotent webhook processor (use `GatewayTransactionId` unique constraint already in place)
3. Auto-activate membership on successful webhook
4. Retain manual verification as fallback for failed webhooks
5. Webhook signature validation (prevent forged payment notifications)

**Schema changes:** Minimal — add `WebhookPayload` text column to `PaymentAttempts` for debugging.

---

### Multiple Photos Per Profile

**Why:** A single photo is limiting. Profiles with more photos get more interest.

**What to build:**
1. Allow up to 5 photos (configurable)
2. Admin moderates all photos
3. User selects a "primary" photo shown in search results
4. Photo ordering (drag-and-drop)
5. Album view on full profile

**Schema changes:** MongoDB already supports a `Photos[]` array. Add a `IsPrimary` flag to `ProfilePhoto`. Change `ProfileIndexes.PhotoUrl` to reflect the primary approved photo.

---

### Self-Service Profile Deactivation

**Why:** Users who no longer want to receive interest requests should be able to hide their profile without deleting their account.

**What to build:**
1. `POST /api/profile/deactivate` — sets Status to Deactivated, removes from search
2. `POST /api/profile/reactivate` — re-activates without requiring re-review
3. Frontend toggle on profile settings page

---

## Medium Priority

### Real-Time Chat (WebSocket / SSE)

**Why:** The current chat requires the user to refresh or navigate away and back to see new messages. Real-time delivery dramatically improves the messaging experience.

**Option A — Server-Sent Events (SSE):** Simpler, one-direction push, good for "new message" notifications.

**Option B — SignalR (WebSocket):** Full duplex, real-time delivery. More complex but matches user expectations.

**What to build:**
1. Add a SignalR hub at `/hub/chat`
2. `ChatService.SendMessageAsync` publishes to the hub after DB save
3. Frontend connects to the hub and receives messages in real time
4. Handle reconnection and message de-duplication

---

### Bengali Language Support (i18n)

**Why:** Most target users speak Bengali. An English-only interface is a barrier.

**What to build:**
1. Integrate `next-intl` or similar i18n library
2. Translate all static UI strings to Bengali
3. Store user language preference in profile or localStorage
4. Language toggle in navbar

---

### Mobile App (React Native)

**Why:** A significant portion of the target demographic accesses the internet primarily through mobile devices.

**The API is already mobile-ready** — JWT auth, RESTful endpoints, platform-agnostic.

**What to build:**
1. React Native app sharing types with the web frontend (monorepo)
2. Push notifications via FCM (Firebase Cloud Messaging)
3. App store listings (Google Play, App Store)

---

### Advanced Matching Algorithm

**Why:** The current algorithm is rule-based (partner expectations vs. candidate profile). A machine-learning approach can improve recommendation quality.

**What to build:**
1. Collaborative filtering based on interest request patterns
2. Engagement signals (who viewed profiles after seeing a match recommendation)
3. A/B testing framework to compare algorithm variants
4. The `IMatchExplainerService` abstraction already supports swapping implementations

---

### Admin Analytics Dashboard

**Why:** As the platform grows, admins need trend data, not just snapshot metrics.

**What to build:**
1. Time-series charts: registrations, active users, interests sent/accepted
2. Conversion funnel: registered → profile created → active → interest sent → accepted
3. Revenue reports: orders, successful payments, revenue by plan
4. Export to CSV for offline analysis

---

### Two-Factor Authentication (2FA)

**Why:** Protects high-value accounts (admins, premium users) from account takeover.

**What to build:**
1. TOTP-based 2FA (Google Authenticator, Authy)
2. Recovery codes
3. `POST /api/auth/2fa/enable`, `POST /api/auth/2fa/verify`
4. Schema: add `TwoFactorSecret` and `TwoFactorEnabled` to `Users`

---

## Lower Priority (v3+)

### Video Calls

Requires WebRTC infrastructure (Agora, Twilio, or self-hosted). High complexity and cost. Consider as a premium feature.

### Profile Verification via NID / Passport

Bangladesh National ID (NID) verification via the government's PORICHOY API. Requires merchant agreement with PORICHOY.

### Horoscope / Kundali Matching

Relevant for Hindu profiles. Calculate compatibility based on birth date and time.

### Smart Notification Batching

Instead of individual notifications, batch them into a daily digest email. Requires email infrastructure and user preference settings.

### Referral Program

Users refer friends and earn free premium days. Schema: add `ReferredBy` FK to `Users`.

---

## Technical Debt to Address

These are not new features but improvements to existing infrastructure:

| Item | Priority | Notes |
|------|----------|-------|
| Redis-backed chat rate limiting | High | Replace `IMemoryCache` to support multi-instance deploys |
| Photo thumbnail generation | Medium | Save bandwidth; generate 200×200 and 800×800 variants on upload |
| Background job system (Hangfire / Quartz) | Medium | Needed for: expired token cleanup, match re-scoring, backup scheduling |
| `__EFMigrationsHistory` health check | Low | Alert if schema is out of sync with deployed code |
| Integration test project | Medium | Cover critical paths (auth, profile, search, interest, payment) |
| Structured logging with Seq or Grafana Loki | Medium | JSON logs for production observability |
| API versioning (`/api/v1/`, `/api/v2/`) | Low | Needed before breaking API changes in v2 |
