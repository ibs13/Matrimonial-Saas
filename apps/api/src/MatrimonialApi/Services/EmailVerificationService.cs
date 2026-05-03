using System.Security.Cryptography;
using System.Text;
using MatrimonialApi.Data;
using MatrimonialApi.Email;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class EmailVerificationService(AppDbContext db, IEmailSender emailSender, IConfiguration config)
{
    private const int TokenExpiryHours = 24;

    // ── Generate and send ─────────────────────────────────────────────────────

    public async Task GenerateAndSendAsync(Guid userId, string email, CancellationToken ct = default)
    {
        // Expire any outstanding unused tokens for this user so only one is valid at a time
        await db.EmailVerificationTokens
            .Where(t => t.UserId == userId && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ExpiresAt, DateTime.UtcNow), ct);

        var rawToken = GenerateRawToken();
        var tokenHash = Hash(rawToken);

        db.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(TokenExpiryHours),
        });

        await db.SaveChangesAsync(ct);

        var baseUrl = config["App:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:3000";
        var verificationUrl = $"{baseUrl}/verify-email?token={Uri.EscapeDataString(rawToken)}";

        await emailSender.SendVerificationEmailAsync(email, verificationUrl, ct);
    }

    // ── Verify ────────────────────────────────────────────────────────────────

    public async Task VerifyAsync(string rawToken)
    {
        var tokenHash = Hash(rawToken);

        var record = await db.EmailVerificationTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (record is null || record.UsedAt is not null)
            throw new ArgumentException("Verification link is invalid or has already been used.");

        if (record.ExpiresAt < DateTime.UtcNow)
            throw new ArgumentException("Verification link has expired. Please request a new one.");

        record.UsedAt = DateTime.UtcNow;
        record.User.IsEmailVerified = true;

        var index = await db.ProfileIndexes.FindAsync(record.User.Id);
        if (index is not null)
            index.IsEmailVerified = true;

        await db.SaveChangesAsync();
    }

    // ── Resend ────────────────────────────────────────────────────────────────

    public async Task ResendAsync(Guid userId, string email)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.IsEmailVerified)
            throw new InvalidOperationException("Email address is already verified.");

        await GenerateAndSendAsync(userId, email);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        // URL-safe base64 (no padding) — 43 chars
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
