namespace MatrimonialApi.Email;

/// <summary>
/// Development-only sender that writes the verification URL to the structured log.
/// No passwords, secrets, or PII beyond the target email address are logged.
/// </summary>
public class DevEmailSender(ILogger<DevEmailSender> logger) : IEmailSender
{
    public Task SendVerificationEmailAsync(string toEmail, string verificationUrl, CancellationToken ct = default)
    {
        logger.LogInformation(
            "[DEV] Verify email for {Email} → {VerificationUrl}",
            toEmail, verificationUrl);

        return Task.CompletedTask;
    }
}
