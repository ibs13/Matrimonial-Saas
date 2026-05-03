# Interest Requests

## Overview

Interest requests are how users express intent to connect. A sent interest that is accepted creates a conversation and grants access to contact unlock. Unaccepted interests do not enable any further interaction.

---

## Sending an Interest

```
POST /api/interests
{
  "receiverId": "uuid",
  "message": "Optional personal message (max 500 chars)"
}
```

### Validations

| Check | Error |
|-------|-------|
| Sender has an active profile | 400 Bad Request |
| Receiver has an active profile | 400 Bad Request |
| Sender ≠ Receiver | 400 Bad Request |
| No existing Pending or Accepted request in either direction | 409 Conflict |
| Sender within monthly interest limit | 429 with code `MONTHLY_LIMIT_EXCEEDED` |

### Monthly Limits

The limit is per calendar month, not a rolling 30-day window.

| Plan | Monthly Limit |
|------|--------------|
| Free | 5 |
| Silver | 20 |
| Gold | 50 |
| Platinum | Unlimited |

The `MembershipService.CanSendInterestThisMonthAsync` method counts `InterestRequests` rows where `SenderId = userId` and `SentAt` is in the current calendar month. It does not distinguish between accepted, rejected, or pending requests — all count toward the limit.

### What Happens After Sending

- `InterestRequests` row created with `Status = Pending`
- Notification sent to receiver: "You have a new interest request from [DisplayName]"
- Receiver sees the request in `/interests/received`

---

## Viewing Sent Interests

```
GET /api/interests/sent?status=Pending&page=1&pageSize=20
```

Returns paginated list of sent requests with status, timestamp, receiver profile info.

Status filter options: `Pending`, `Accepted`, `Rejected` (omit for all).

---

## Viewing Received Interests

```
GET /api/interests/received?status=Pending&page=1&pageSize=20
```

Returns paginated list of received requests. Each item shows the sender's profile: display name, gender, age, location, education level, completion percentage, photo.

---

## Accepting an Interest

```
PATCH /api/interests/{id}/accept
```

- Request must be in `Pending` status
- `Status` → `Accepted`, `RespondedAt` → now
- A **Conversation** is created automatically: `{ User1Id: min(ids), User2Id: max(ids) }`
- Notification sent to sender: "Your interest request was accepted by [DisplayName]"
- Both users can now message each other at `/chat/{userId}`

The conversation is created with `IsClosed = false`. It can only be closed by an admin.

---

## Rejecting an Interest

```
PATCH /api/interests/{id}/reject
```

- Request must be in `Pending` status
- `Status` → `Rejected`, `RespondedAt` → now
- Notification sent to sender: "Your interest request was not accepted"

The sender can send a new interest to the same person in a future month (the rejected request does not permanently block re-sending, though a new Pending request cannot be sent while a Rejected one exists in the same period — the check looks for any non-expired request in either direction).

---

## Cancelling a Sent Interest

```
DELETE /api/interests/{id}
```

- Only the sender can cancel
- Only `Pending` requests can be cancelled
- The cancelled request counts toward the sender's monthly limit

---

## Interest Request Statuses

```
[Pending]
    │
    ├─ Receiver accepts → [Accepted]
    ├─ Receiver rejects → [Rejected]
    └─ Sender cancels  → [Cancelled]
```

Once an interest is accepted, there is no "un-accept" or disconnect operation in v1. The conversation persists until closed by an admin.

---

## Relationship to Chat

An accepted interest is the **only** way to unlock chat with another user. The `ChatService.ValidateSendAsync` method checks:

```csharp
var hasAccepted = await db.InterestRequests.AnyAsync(r =>
    ((r.SenderId == senderId && r.ReceiverId == receiverId) ||
     (r.SenderId == receiverId && r.ReceiverId == senderId)) &&
    r.Status == InterestRequestStatus.Accepted);

if (!hasAccepted)
    throw new InvalidOperationException("No accepted interest request.");
```

This check runs on every message send, not just conversation creation.

---

## Data Shape

```typescript
interface InterestRequestResponse {
  id: string;
  senderId: string;
  receiverId: string;
  otherUserId: string;         // the other party (not the current user)
  otherDisplayName: string;
  otherGender: string;
  otherAgeYears: number;
  otherCountryOfResidence: string;
  otherDivision: string;
  status: InterestRequestStatus;
  message: string | null;
  sentAt: string;
  respondedAt: string | null;
}
```

The `otherUserId` field is always the user who is not the current user, regardless of whether the current user is the sender or receiver. This simplifies the frontend logic for both the sent and received lists.
