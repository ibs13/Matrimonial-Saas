# User Flows

## Complete User Journey

This document traces the typical path from a new visitor to an active user having a conversation.

---

## 1. Registration

**Entry point:** `/register`

1. User fills in email and password
2. Frontend calls `POST /api/auth/register`
3. API creates `Users` row, `UserMembership` (Free plan), issues access + refresh tokens
4. Tokens stored in `localStorage`
5. API sends a verification email (or logs the link to console in dev)
6. User is redirected to `/dashboard`
7. A banner prompts the user to verify their email

**What the user can do before email verification:**
- Browse and search profiles
- Create and edit their own profile
- Send interest requests (limited by Free plan)

**What requires email verification:**
- The "Email Verified" badge on their profile
- Identity verification eligibility

---

## 2. Profile Creation (Multi-Step)

**Entry point:** `/profile/setup`

Profile creation is non-linear. Users can fill sections in any order and save incrementally. The completion percentage updates after each save.

**Step 1 — Basic Info**
- Display name, gender, date of birth, religion, marital status, location
- `PATCH /api/profile/basic`
- This unlocks appearance in search results (once profile is submitted and approved)

**Step 2 — Physical Info**
- Height, weight, body type, complexion, blood group
- `PATCH /api/profile/physical`

**Step 3 — Education**
- Education level, field of study, institution, graduation year
- `PATCH /api/profile/education`

**Step 4 — Career**
- Employment type, occupation, organization, income
- `PATCH /api/profile/career`

**Step 5 — Family**
- Parents' occupations, sibling count, family type, family location
- `PATCH /api/profile/family`

**Step 6 — Religion**
- Islamic sect, prayer habit, hijab/beard status, mazhab
- `PATCH /api/profile/religion`

**Step 7 — Lifestyle**
- Diet, smoking habit, hobbies
- `PATCH /api/profile/lifestyle`

**Step 8 — Partner Expectations**
- Desired age range, height range, education level, religion, location, family status
- `PATCH /api/profile/partner-expectations`
- **This section is required for match scoring to work**

**Step 9 — Photo Upload**
- Upload a photo (max 6MB, JPEG/PNG)
- `POST /api/profile/photo`
- Photo is in `Pending` status until an admin approves it
- After approval, it appears in search results

**Step 10 — Submit for Review**
- `POST /api/profile/submit`
- Status changes from `Draft` to `PendingReview`
- Admin must approve before the profile is `Active` and visible in search

---

## 3. Searching Profiles

**Entry point:** `/search`

1. User applies filters: gender, religion, age range, location, education, etc.
2. Frontend calls `POST /api/search` with filter parameters
3. API queries `ProfileIndexes` (PostgreSQL only)
4. Results include: display name, age, religion, location, education, completion %, photo, verification badges
5. User clicks a profile card to view the full profile

**Filter dimensions:**
- Gender, Religion, Marital Status
- Country → Division → District (location drill-down)
- Age range (min–max)
- Height range (min–max)
- Minimum education level
- Employment types (multi-select)
- Sort by: Newest, Completion %, Last Active

**What is not shown in search results:**
- Full name (hidden)
- Phone, address (hidden)
- Private photos

---

## 4. Sending an Interest Request

**Entry point:** Profile view page → "Send Interest" button

1. User views a profile at `/profile/{userId}`
2. Clicks "Send Interest" (optionally with a message)
3. Frontend calls `POST /api/interests` `{ receiverId, message }`
4. API checks: no duplicate pending/accepted request in either direction
5. API checks: sender is within their monthly interest limit (Free = 5/month)
6. Creates `InterestRequests` row with `Status = Pending`
7. Creates a notification for the receiver
8. Returns the interest request

**Monthly limits by plan:**

| Plan | Monthly Interests |
|------|-----------------|
| Free | 5 |
| Silver | 20 |
| Gold | 50 |
| Platinum | Unlimited |

If the limit is exceeded, the API returns `429 Too Many Requests` with code `MONTHLY_LIMIT_EXCEEDED`.

---

## 5. Receiving and Responding to Interests

**Entry point:** `/interests/received`

1. User sees a list of pending interest requests with sender's profile preview
2. User clicks "Accept" or "Reject"
3. **On Accept:**
   - `PATCH /api/interests/{id}/accept`
   - `InterestRequests.Status = Accepted`
   - A `Conversation` is created automatically (User1Id < User2Id pair)
   - Notification sent to the sender
   - User is redirected to the conversation
4. **On Reject:**
   - `PATCH /api/interests/{id}/reject`
   - `InterestRequests.Status = Rejected`
   - Notification sent to the sender

---

## 6. Chat

**Entry point:** `/chat` (list) → `/chat/{userId}` (thread)

Chat is only available between two users who have an accepted interest request. Both users must have active, visible profiles. Neither can have blocked the other. The conversation must not be closed by an admin.

**Sending a message:**
1. User types in the input and presses Send
2. `POST /api/chat/conversations/{userId}/messages` `{ body }`
3. API checks: accepted interest, active profiles, no block, not closed, rate limit, banned words
4. Message saved, `Conversation.LastMessageAt` updated
5. Response includes the new message

**Read receipts:**
- `PATCH /api/chat/conversations/{userId}/read` marks all messages in the thread as read
- Called automatically when the user opens the conversation
- Unread count badge in the navbar updates on a 60-second poll

**Reporting a message:**
1. Click the flag icon on any received message
2. Enter a reason (max 300 characters)
3. `POST /api/chat/messages/{messageId}/report` `{ reason }`
4. The flag icon turns gray (idempotent — cannot report twice)

**Conversation closed by admin:**
- A red banner appears: "This conversation has been closed by an admin"
- The input field is disabled
- The conversation appears as "Closed by admin" in the chat list

---

## 7. Shortlisting Profiles

**Entry point:** Profile view → "Save" button, or `/shortlist` to view saved

- `POST /api/saved/{userId}` — add to shortlist
- `DELETE /api/saved/{userId}` — remove from shortlist
- `GET /api/saved` — view all saved profiles

No interest request is required to save a profile.

---

## 8. Viewing Notifications

**Entry point:** `/notifications` or the bell icon in the navbar

Notification events that trigger an in-app notification:
- Interest request received
- Interest request accepted or rejected
- Profile approved or rejected by admin
- Photo approved or rejected by admin

`GET /api/notifications?page=1&pageSize=20` — returns notifications newest first with total unread count. Notifications are marked read individually or via "mark all read".

---

## 9. Upgrading Membership

**Entry point:** `/membership` → Plan selection → `/billing`

1. User views plan comparison at `/membership`
2. Selects a plan
3. `POST /api/orders` `{ plan }` — creates a pending order
4. User is redirected to `/billing/{orderId}`
5. User submits payment proof: gateway name + transaction ID
6. `POST /api/orders/{orderId}/submit-payment` `{ gatewayName, transactionId }`
7. An admin manually verifies the payment in `/admin/payments`
8. On verification: `UserMembership.Plan` is updated, `ProfileIndex.IsPremiumMember = true`
9. User sees their updated plan at `/membership`

---

## 10. Support Tickets

**Entry point:** `/support`

1. User clicks "New Ticket" → `/support/new`
2. Selects category (Technical, Billing, Account, Safety, Other)
3. Enters subject and message body
4. `POST /api/support/tickets` — creates ticket + first message
5. User can view ticket status and add replies at `/support/{id}`
6. Admin replies appear in the same thread
7. User can close a resolved ticket

---

## 11. Who Viewed My Profile

**Entry point:** `/profile/viewers`

- When any user views a profile, `POST /api/profile/{id}/view` is called automatically by the frontend
- Deduplicated per UTC day (same viewer + same profile within 24 hours = one entry)
- `GET /api/profile/viewers?page=1` shows a paginated list of recent viewers
- Shows: display name, gender, age, location, photo, time of view

---

## 12. Contact Unlock (Premium)

After an interest request is accepted, premium users can reveal the other person's phone number and address:

1. `GET /api/profile/{userId}/contact` — checks unlock status
   - Returns `{ isUnlocked: false, canUnlock: true }` if eligible
2. `POST /api/profile/{userId}/unlock-contact` — performs the unlock
   - Requires active premium membership
   - Creates a `ContactUnlocks` record
   - Returns actual phone, address values
3. Subsequent calls to `GET /api/profile/{userId}/contact` return `{ isUnlocked: true, phone, address, ... }`
