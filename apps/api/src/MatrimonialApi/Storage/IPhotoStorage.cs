namespace MatrimonialApi.Storage;

/// <summary>
/// Abstraction over photo file storage.
/// Swap LocalDiskPhotoStorage for an S3/R2/Azure Blob implementation without touching service code.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Validates, saves and returns the public URL path for the file.</summary>
    Task<string> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default);

    /// <summary>Deletes the file at the given URL path. No-ops if the file does not exist.</summary>
    Task DeleteAsync(string urlPath, CancellationToken ct = default);
}
