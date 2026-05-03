# Reporting

## Overview

The platform has two separate reporting systems:

1. **Profile reports** — users report abusive or fake profiles
2. **Message reports** — users report specific chat messages

Both feed into admin review queues with audit-logged resolutions.

---

## Profile Reports

### Submitting a Report

```
POST /api/reports/profiles/{userId}
Authorization: Bearer {accessToken}
{
  "reason": "Fake",
  "description": "This profile is using someone else's photo"
}
```

**Reason enum values:** `Fake`, `Inappropriate`, `Spam`, `Harassment`, `Other`

**Validations:**
- User cannot report their own profile
- Duplicate reports are rejected (same reporter + same target = idempotent)
- Both reporter and reported user must exist

Creates a `ProfileReports` row with `Status = Active`.

### Viewing Your Reports

```
GET /api/reports/my-reports
```

Returns the reports you have submitted with their current statuses.

### Admin: Viewing the Report Queue

```
GET /api/admin/reports?status=Active&page=1&pageSize=20
```

Returns reports with reporter name, reported profile name, reason, description, and timestamp.

### Admin: Dismissing a Report

```
PATCH /api/admin/reports/{id}/dismiss
```

- Sets `ProfileReports.Status = Dismissed`
- No action taken against the reported profile
- Creates AuditLog: `Action = DismissReport`

### Admin: Dismiss + Suspend

```
PATCH /api/admin/reports/{id}/suspend
{ "reason": "Identity fraud confirmed" }
```

Single action that:
1. Dismisses the report
2. Suspends the reported profile (sets MongoDB and PostgreSQL `Status = Suspended`)
3. Creates AuditLog: `Action = DismissAndSuspendFromReport`

This is the typical flow when a report is verified.

---

## Message Reports

### Reporting a Message

Users can report any message sent by the other person in a conversation:

```
POST /api/chat/messages/{messageId}/report
Authorization: Bearer {accessToken}
{
  "reason": "This message contains harassment"
}
```

**Max length for reason:** 300 characters

**Validations:**
- Reporter must be a participant in the conversation
- Reporter cannot report their own message
- Duplicate reports silently succeed (idempotent — second report for the same message by the same person has no effect)

Creates a `MessageReports` row with `Status = Open`.

The report button on the frontend becomes disabled (grayed out) after a successful report. The `isReported` flag on the `MessageResponse` DTO controls this.

### Admin: Viewing the Message Report Queue

```
GET /api/admin/chat/reports?status=Open&page=1&pageSize=20
```

Returns each report with:
- The message body
- Sender's display name
- Reporter's display name
- Reason
- Timestamp
- Whether the conversation is already closed

Filter by status: `Open` or `Dismissed`.

### Admin: Dismissing a Message Report

```
PATCH /api/admin/chat/reports/{id}/dismiss
```

- Sets `MessageReports.Status = Dismissed`, `ReviewedAt = now`, `ReviewedByAdminId = admin.Id`
- No action taken against the conversation or sender
- Creates AuditLog: `Action = DismissMessageReport`

### Admin: Closing the Conversation

```
POST /api/admin/chat/conversations/{convId}/close
```

- Sets `Conversation.IsClosed = true`, `ClosedAt = now`
- Disables all further messaging in the conversation for both users
- **Permanent** — there is no reopen endpoint
- Both users immediately see a "Closed by admin" banner
- Creates AuditLog: `Action = CloseConversation`

This is typically done when a report reveals ongoing harassment and the admin wants to stop all communication between the two users.

---

## Report Statuses

### Profile Reports

| Status | Meaning |
|--------|---------|
| `Active` | Awaiting admin review |
| `Dismissed` | Admin reviewed, no action taken |

### Message Reports

| Status | Meaning |
|--------|---------|
| `Open` | Awaiting admin review |
| `Dismissed` | Admin reviewed, no action taken |

---

## Frontend Integration

**Profile view page:** A "Report Profile" button is shown on every profile that is not the current user's own profile. Clicking it opens a form with reason dropdown and description textarea.

**Chat thread page:** A flag icon appears on each message sent by the other user. It is:
- Clickable → shows a reason textarea + Submit/Cancel buttons
- Grayed out if `message.isReported == true` (already reported by the current user)

**Chat list page:** Conversations with `isClosed = true` show an orange "Closed by admin" label instead of the last message preview.

**Admin chat page (`/admin/chat`):** Tabs for Open/Dismissed reports. Each card shows message body, names, reason, and action buttons (Dismiss, Close Conversation).
