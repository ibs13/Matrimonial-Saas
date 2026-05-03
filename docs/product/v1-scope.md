# v1 Scope

## What Is Included in v1

This document defines the boundaries of the current release. Everything listed here is implemented, tested, and deployable.

---

### Authentication and Accounts

- Email + password registration
- JWT access tokens (60-minute lifetime) with refresh token rotation
- Email verification via single-use hashed tokens
- Logout (token revocation)
- Admin role promotion (manual SQL — no self-service admin creation)

### Profile Management

- Multi-section profile: Basic, Physical, Education, Career, Family, Religion, Lifestyle, Partner Expectations
- Contact section: Phone, Guardian Phone, Present Address, Permanent Address (hidden by default)
- Profile visibility settings: ShowFullName, ShowPhone, ShowAddress, ProfileVisible
- Profile completion percentage (weighted per section)
- Profile submission for admin review
- Draft → PendingReview → Active → Suspended lifecycle
- Single photo per profile with admin approval workflow
- Profile view tracking ("who viewed me")
- Verification badges: Email Verified, Phone Added, Identity Verified, Premium Member

### Search

- Filtered search on 10+ dimensions: Gender, Religion, Marital Status, Country, Division, District, Age Range, Height Range, Min Education Level, Employment Types
- Sort options: Newest, Completion %, Last Active
- Paginated results (default 20 per page)
- Results limited to Active + Visible profiles, excluding the current user

### Interest Requests

- Send interest with optional message
- Accept / Reject / Cancel
- Monthly limits enforced per membership plan (Free: 5, Silver: 20, Gold: 50, Platinum: unlimited)
- Auto-create conversation on acceptance
- Notifications for received, accepted, rejected interests

### Shortlist / Saved Profiles

- Save any profile to a personal shortlist
- Remove from shortlist
- View all saved profiles

### Membership and Billing

- Four tiers: Free, Silver, Gold, Platinum
- Manual payment verification flow: user submits gateway name + transaction ID, admin verifies
- Order lifecycle: Pending → Completed / Failed
- Membership activation after admin verification
- Payment attempt history per order

### Contact Unlock (Premium)

- Premium users can unlock contact details (phone, address) of accepted connections
- Unlock is permanent and audited in `ContactUnlocks`
- Non-premium users see "upgrade required" message

### Chat

- Conversation created automatically when interest is accepted
- Text messages (max 1000 characters per message)
- Read receipts
- Unread message count badge (60-second polling)
- User blocking and unblocking
- Chat rate limiting (20 messages/minute per user, configurable)
- Banned word filter (configurable list)

### Notifications

- In-app notifications for: interest received, accepted, rejected; profile approved/rejected; photo approved/rejected
- Mark as read (single or all)
- Pagination

### Support Tickets

- Users create tickets (Technical, Billing, Account, Safety, Other)
- Message thread between user and admin staff
- Status management: Open → InProgress → Resolved → Closed
- User can close a resolved ticket

### Profile Reporting

- Users report profiles: Fake, Inappropriate, Spam, Harassment, Other
- Admin review queue
- Dismiss or Dismiss + Suspend actions

### Message Reporting and Chat Moderation

- Users report specific chat messages with a reason
- Admin moderation page at `/admin/chat`
- Dismiss report or close conversation
- `IsClosed` flag visible to both users in real time

### AI Match Explainer

- Compatibility scoring (0–100) based on partner expectations vs candidate profile
- Match levels: Poor, Fair, Good, Excellent
- AI-generated natural-language explanations via Anthropic API
- Deterministic fallback when Anthropic API key is not configured
- 24-hour cache per user (manual refresh available)

### Admin Panel

- Profile review queue (approve, reject, suspend)
- Photo moderation queue (approve, reject)
- Identity verification (grant, revoke)
- Payment verification (verify, reject with reason)
- Profile reports queue
- Message reports queue
- Support ticket queue (reply, change status)
- Admin dashboard with key metrics
- Audit log (all admin actions, immutable)

### Infrastructure

- Docker Compose with 6 services (PostgreSQL, MongoDB, API, Web, pgAdmin, mongo-express)
- GitHub Actions CI (API: build + test; Web: lint + type-check + build)
- Health check endpoints (`/health`, `/health/ready`)
- Correlation ID header on all requests
- Global exception middleware (consistent JSON error responses)
- HTTPS + HSTS in production

---

## What Is Not in v1

The following were explicitly deferred. See `docs/product/roadmap.md` for planned v2 additions.

| Feature | Reason Deferred |
|---------|----------------|
| Video calls | High complexity, third-party infra required (WebRTC / Agora) |
| Voice calls | Same as video |
| Automated payment gateway integration | Requires merchant accounts with SSLCommerz / bKash / Nagad; manual verification chosen for v1 |
| Password reset / forgot password | No email infrastructure in v1 deploy; add with email sender |
| Social login (Google, Facebook) | Added complexity to auth; email/password sufficient for launch |
| Multiple photos per profile | One photo is sufficient for v1 |
| Profile view privacy ("anonymous mode") | Not commonly requested in v1 user research |
| Match suggestions to admin | Not needed for v1 |
| Push notifications (mobile) | No mobile app in v1 |
| Two-factor authentication | Not required for v1 threat model |
| Audit log for user actions | Only admin actions are audited in v1 |
| Advanced analytics dashboard | Not needed at v1 scale |
| Profile deactivation by user | Admin can suspend; self-deactivation is a v2 addition |
| Bulk admin actions | Single-action admin operations are sufficient for v1 scale |

---

## Constraints and Assumptions

- **Single region:** v1 is designed for a single-region deployment. No multi-region replication or CDN is included.
- **Bengali / Bangladesh focus:** Location fields (Division, District) are text fields, not bound to a specific list. The platform is designed for the Bangladeshi market but is not technically restricted.
- **Single language:** The UI is in English. Bengali language support (i18n) is not included.
- **Manual payment:** There is no automated payment gateway webhook processing. All payments require manual admin verification.
- **In-memory rate limiting:** Chat rate limits use `IMemoryCache`. They reset on API restart and are not shared across multiple API instances.
