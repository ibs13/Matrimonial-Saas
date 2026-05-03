# Admin Flows

## Admin Access

Admin accounts are created by promoting an existing user account directly in PostgreSQL:

```sql
UPDATE "Users" SET "Role" = 'Admin' WHERE "Email" = 'admin@example.com';
```

Admins log in through the same `/login` page as regular users. The frontend shows admin navigation links when `isAdmin` is true in `AuthContext`.

All admin API routes are under `/api/admin/*` and require the `AdminOnly` policy (`Role == "Admin"`). Every action that modifies data creates an `AuditLog` entry.

---

## Admin Dashboard

**Frontend:** `/admin/dashboard`  
**API:** `GET /api/admin/metrics`

Returns real-time counts:

| Metric | Description |
|--------|-------------|
| Total users | All registered users |
| Verified users | Users with `IsEmailVerified = true` |
| New users (7 days) | Registrations in the last week |
| Draft profiles | Profiles not yet submitted for review |
| Pending review | Profiles awaiting admin approval |
| Active profiles | Approved, visible profiles |
| Suspended profiles | Profiles suspended by admin |
| Active reports | Open profile reports |
| Pending photos | Photos awaiting approval |
| Recent activity | Latest 10 audit log entries |

---

## Profile Review Queue

**Frontend:** `/admin/profiles`  
**API:** `GET /api/admin/profiles/pending?page=1&pageSize=20`

Lists profiles in `PendingReview` status. Admin clicks a profile to see full details including the user's email address (not visible to regular users).

**API:** `GET /api/admin/profiles/{id}`

Returns the complete profile (all 8 sections) plus the account email. This is the only place the email is surfaced outside the user's own session.

### Approve a Profile

```
PATCH /api/admin/profiles/{id}/approve
```

- Sets MongoDB `Status = Active`
- Sets PostgreSQL `ProfileIndexes.Status = Active`
- Sends "Profile Approved" notification to user
- Creates AuditLog entry

### Reject a Profile

```
PATCH /api/admin/profiles/{id}/reject
{ "reason": "Profile contains inappropriate content" }
```

- Sets MongoDB `Status = Draft`
- Sets PostgreSQL `ProfileIndexes.Status = Draft`
- Sends "Profile Rejected" notification with reason to user
- Creates AuditLog entry
- User can edit and resubmit

### Suspend a Profile

```
PATCH /api/admin/profiles/{id}/suspend
{ "reason": "Multiple verified reports" }
```

- Sets MongoDB and PostgreSQL `Status = Suspended`
- Suspended profiles do not appear in search
- No automatic unsuspension — admin must restore manually
- Creates AuditLog entry

---

## Photo Moderation

**Frontend:** `/admin/photos` (part of admin dashboard)  
**API:** `GET /api/admin/photos/pending?page=1&pageSize=20`

Lists all photos with `Status = Pending`.

### Approve a Photo

```
PATCH /api/admin/photos/{userId}/approve
```

- Sets `photo.Status = Approved` in MongoDB
- Sets `ProfileIndexes.PhotoUrl = photo.Url` in PostgreSQL
- The photo now appears in search results
- Sends "Photo Approved" notification to user

### Reject a Photo

```
PATCH /api/admin/photos/{userId}/reject
{ "reason": "Not a clear face photo" }
```

- Sets `photo.Status = Rejected` in MongoDB
- `ProfileIndexes.PhotoUrl` remains null
- Sends "Photo Rejected" notification with reason
- User can upload a new photo

---

## Identity Verification

**API:** `PATCH /api/admin/profiles/{id}/verify-identity`

Marks a user as identity-verified after the admin has reviewed supporting documents (submitted via support ticket or other channel). Sets `ProfileIndexes.IsIdentityVerified = true`.

To revoke: `DELETE /api/admin/profiles/{id}/verify-identity`

---

## Payment Verification

**Frontend:** `/admin/payments`  
**API:** `GET /api/admin/payment-attempts?status=Pending&page=1&pageSize=20`

Users submit payment proofs (gateway name + transaction ID). Admins review and verify or reject.

### Verify a Payment

```
PATCH /api/admin/payment-attempts/{id}/verify
```

- Sets `PaymentAttempt.Status = Success`, `CompletedAt = now`
- Sets `Order.Status = Completed`, `PaidAt = now`
- Updates `UserMembership.Plan`, `StartedAt`, `ExpiresAt`
- Sets `ProfileIndexes.IsPremiumMember = true`
- Creates AuditLog entry

### Reject a Payment

```
PATCH /api/admin/payment-attempts/{id}/reject
{ "reason": "Transaction ID not found in gateway records" }
```

- Sets `PaymentAttempt.Status = Failed`, `FailureReason = reason`
- Order remains `Pending` — user can submit a new payment attempt
- Creates AuditLog entry

---

## Profile Reports Queue

**Frontend:** `/admin/reports`  
**API:** `GET /api/admin/reports?status=Active&page=1&pageSize=20`

Lists reports submitted by users against profiles.

### Dismiss a Report

```
PATCH /api/admin/reports/{id}/dismiss
```

No action taken against the reported profile. Report marked as reviewed. Creates AuditLog.

### Dismiss + Suspend

```
PATCH /api/admin/reports/{id}/suspend
{ "reason": "Fake profile confirmed" }
```

Dismisses the report and immediately suspends the reported profile in one action.

---

## Support Ticket Queue

**Frontend:** `/admin/support`  
**API:** `GET /api/admin/support/tickets?status=Open&page=1`

Lists all user support tickets filterable by status and category.

### View Ticket

```
GET /api/admin/support/tickets/{id}
```

Returns full ticket with all messages including user email.

### Reply to Ticket

```
POST /api/admin/support/tickets/{id}/messages
{ "body": "We have resolved your issue..." }
```

Adds a staff reply to the thread. Frontend shows staff replies differently from user messages.

### Update Status

```
PATCH /api/admin/support/tickets/{id}/status
{ "status": "Resolved" }
```

Valid transitions: `Open → InProgress → Resolved → Closed`

---

## Chat Moderation

**Frontend:** `/admin/chat`  
**API:** `GET /api/admin/chat/reports?status=Open&page=1`

Lists messages that users have reported. Admin sees: the message body, who sent it, who reported it, and the reason.

### Dismiss a Message Report

```
PATCH /api/admin/chat/reports/{id}/dismiss
```

No further action. Marks the report `Dismissed`. Creates AuditLog.

### Close a Conversation

```
POST /api/admin/chat/conversations/{convId}/close
```

- Sets `Conversation.IsClosed = true`, `ClosedAt = now`
- Both users see the conversation as closed immediately
- No new messages can be sent in a closed conversation
- **This action is permanent** — there is no reopen endpoint
- Creates AuditLog entry

---

## Audit Log

**Frontend:** Part of admin dashboard  
**API:** `GET /api/admin/audit-logs?page=1&action=SuspendProfile`

All admin actions are logged automatically by the services. Each entry contains:

| Field | Description |
|-------|-------------|
| AdminEmail | Email of the admin who performed the action |
| Action | Verb describing the action (e.g., `ApproveProfile`, `CloseConversation`) |
| EntityType | Type of entity modified (e.g., `Profile`, `Conversation`, `PaymentAttempt`) |
| EntityId | ID of the entity |
| Reason | Optional reason provided by the admin |
| CreatedAt | Timestamp of the action |

The audit log cannot be deleted and is preserved even if the admin account is removed.
