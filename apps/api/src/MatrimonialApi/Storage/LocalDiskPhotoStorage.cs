namespace MatrimonialApi.Storage;

/// <summary>
/// Stores photos on the local filesystem under wwwroot/uploads/photos/.
/// Served by app.UseStaticFiles(). Replace with an S3/R2 implementation for production.
/// </summary>
public class LocalDiskPhotoStorage(IWebHostEnvironment env) : IPhotoStorage
{
    private static readonly HashSet<string> AllowedExtensions =
        [".jpg", ".jpeg", ".png", ".webp"];

    private const long MaxBytes = 5 * 1024 * 1024; // 5 MB

    public async Task<string> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default)
    {
        if (file.Length == 0)
            throw new ArgumentException("Uploaded file is empty.");

        if (file.Length > MaxBytes)
            throw new ArgumentException("File size must not exceed 5 MB.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new ArgumentException("Only JPG, PNG, and WebP files are allowed.");

        var uploadDir = Path.Combine(WebRootPath, "uploads", "photos");
        Directory.CreateDirectory(uploadDir);

        var fileName = $"{userId}{ext}";
        var fullPath = Path.Combine(uploadDir, fileName);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        return $"/uploads/photos/{fileName}";
    }

    public Task DeleteAsync(string urlPath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(urlPath)) return Task.CompletedTask;

        var relative = urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(WebRootPath, relative);

        if (File.Exists(fullPath)) File.Delete(fullPath);

        return Task.CompletedTask;
    }

    private string WebRootPath =>
        env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
}
