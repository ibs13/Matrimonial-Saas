# Photo Upload

## Overview

Each profile supports one photo in v1. Photos go through an admin approval workflow before they appear in search results. Users can set their photo visibility to Public or Private independently of the approval status.

---

## Upload Flow

```
1. User selects a file
2. Frontend sends: POST /api/profile/photo
                   Content-Type: multipart/form-data
                   Body: file field with the image

3. API validates:
   - File must be present
   - Size ≤ 6MB
   - Content type must be image/jpeg or image/png

4. API saves the file:
   - Development: stored at apps/api/src/MatrimonialApi/wwwroot/photos/{guid}.jpg
   - Production: stored in the configured cloud storage (S3, R2, etc.)
   - File served at: {API_URL}/photos/{filename}

5. API updates MongoDB profile:
   - Clears Photos[] array
   - Adds: { Url, Visibility: Public, Status: Pending, UploadedAt: now }

6. API does NOT update ProfileIndexes.PhotoUrl yet
   (photo is not shown in search until approved)

7. Returns updated ProfileResponse
```

---

## Approval Workflow

After upload, the photo status is `Pending`. It appears in the admin's photo queue:

```
GET /api/admin/photos/pending
```

Returns a list of all pending photos with thumbnail URLs and uploader's display name.

### Approve

```
PATCH /api/admin/photos/{userId}/approve
```

- Sets `photo.Status = Approved` in MongoDB
- Sets `ProfileIndexes.PhotoUrl = photo.Url` in PostgreSQL
- Sends "Photo Approved" notification to user
- Photo now appears in search result cards

### Reject

```
PATCH /api/admin/photos/{userId}/reject
{ "reason": "Photo does not show a clear face" }
```

- Sets `photo.Status = Rejected` in MongoDB
- `ProfileIndexes.PhotoUrl` remains null (or keeps the previous approved URL if one existed)
- Sends "Photo Rejected" notification with reason
- User can upload a new photo

---

## Photo Status States

```
                Upload
                  │
                  ▼
             [Pending]
            /         \
    Approved           Rejected
        │                 │
        ▼                 ▼
   [Approved]         [Rejected]
  Shown in search    Not shown
```

---

## Visibility Settings

Separate from admin approval, users can control who sees their photo:

```
PATCH /api/profile/photo/visibility
{ "visibility": "Public" }
```

| Value | Who sees the photo |
|-------|-------------------|
| `Public` | Any authenticated user (if approved) |
| `Private` | Only the profile owner |

Setting to `Private` immediately hides the photo from search results and profile views, regardless of admin approval. The `ProfileIndexes.PhotoUrl` is cleared when visibility is set to `Private`.

---

## Deleting a Photo

```
DELETE /api/profile/photo
```

- Removes the photo document from MongoDB `Photos[]` array
- Sets `ProfileIndexes.PhotoUrl = null` in PostgreSQL
- The physical file is not deleted from disk in the current implementation (dev artifact)
- Returns updated ProfileResponse

---

## Storage Abstraction

Photo storage is abstracted behind `IPhotoStorage`:

```csharp
public interface IPhotoStorage {
    Task<string> SaveAsync(IFormFile file, CancellationToken ct);
    Task DeleteAsync(string url, CancellationToken ct);
}
```

**Development implementation:** `LocalDiskPhotoStorage`
- Saves files to `wwwroot/photos/` with a GUID filename
- Deletes files from the same directory
- Files served as static files via `app.UseStaticFiles()`

**Production:** Replace with a cloud storage implementation (AWS S3, Cloudflare R2, Azure Blob). Register the new implementation in `Program.cs`:

```csharp
// Replace this:
builder.Services.AddScoped<IPhotoStorage, LocalDiskPhotoStorage>();
// With this:
builder.Services.AddScoped<IPhotoStorage, S3PhotoStorage>();
```

The `S3PhotoStorage` implementation must upload the file and return the public URL. The URL is stored directly in MongoDB and PostgreSQL — no file path abstraction is needed.

---

## Photo in Search Results

The photo URL stored in `ProfileIndexes.PhotoUrl` is the one displayed in search result cards and the profile header. It is:

1. Set only when an approved photo with `Visibility = Public` exists
2. Cleared when the photo is rejected, deleted, or set to Private
3. Always a direct URL to the file (no signed URLs in v1)

When viewing a full profile, the frontend calls `GET /api/profile/{userId}/photo` which respects the current visibility settings for the requesting user. Private photos are only returned to the profile owner.

---

## Limitations (v1)

- One photo per profile only. Multiple photo support is a v2 feature.
- No image resizing or thumbnail generation. The full uploaded file (up to 6MB) is served.
- File cleanup on delete only removes the MongoDB record, not the physical file in development.
- No content-aware moderation (nudity detection, face detection). Admin reviews manually.
