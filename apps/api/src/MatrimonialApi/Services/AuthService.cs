using MatrimonialApi.Data;
using MatrimonialApi.DTOs.Auth;
using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Services;

public class AuthService(AppDbContext db, TokenService tokenService)
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == request.Email.ToLower());
        if (exists)
            throw new InvalidOperationException("Email is already registered.");

        var user = new User
        {
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return await IssueTokensAsync(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == request.Email.ToLower());

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        return await IssueTokensAsync(user);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request)
    {
        var stored = await db.RefreshTokens
            .Include(rt => rt.User)
            .SingleOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (stored is null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token is invalid or expired.");

        if (!stored.User.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        // Rotate: revoke old, issue new
        stored.IsRevoked = true;
        await db.SaveChangesAsync();

        return await IssueTokensAsync(stored.User);
    }

    public async Task LogoutAsync(string rawRefreshToken)
    {
        var stored = await db.RefreshTokens
            .SingleOrDefaultAsync(rt => rt.Token == rawRefreshToken);

        if (stored is null || stored.IsRevoked)
            return;

        stored.IsRevoked = true;
        await db.SaveChangesAsync();
    }

    private async Task<AuthResponse> IssueTokensAsync(User user)
    {
        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user);
        var newToken = tokenService.CreateRefreshToken(user.Id);

        // Delete all expired or revoked tokens for this user in one statement.
        // ExecuteDeleteAsync bypasses the change tracker and runs a direct DELETE.
        await db.RefreshTokens
            .Where(rt => rt.UserId == user.Id && (rt.IsRevoked || rt.ExpiresAt < DateTime.UtcNow))
            .ExecuteDeleteAsync();

        // After the cleanup above, every remaining row is an active session.
        // If the user is at the cap, revoke the oldest sessions to stay within it.
        const int MaxActiveSessions = 5;
        var activeSessions = await db.RefreshTokens
            .Where(rt => rt.UserId == user.Id)
            .OrderBy(rt => rt.CreatedAt)
            .ToListAsync();

        if (activeSessions.Count >= MaxActiveSessions)
        {
            var excess = activeSessions.Count - MaxActiveSessions + 1; // +1 to leave room for the new token
            foreach (var old in activeSessions.Take(excess))
                old.IsRevoked = true;
        }

        db.RefreshTokens.Add(newToken);

        var index = await db.ProfileIndexes.FindAsync(user.Id);
        if (index is not null)
            index.LastActiveAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = newToken.Token,
            AccessTokenExpiresAt = expiresAt,
            Role = user.Role.ToString(),
        };
    }
}
