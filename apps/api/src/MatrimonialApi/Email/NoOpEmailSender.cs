namespace MatrimonialApi.Email;

/// <summary>
/// Production placeholder. Warns that email is not configured.
/// Replace with a real provider (SendGrid, SES, Postmark…) before going live.
/// </summary>
public class NoOpEmailSender(ILogger<NoOpEmailSender> logger) : IEmailSender
{
    public Task SendVerificationEmailAsync(string toEmail, string verificationUrl, CancellationToken ct = default)
    {
        logger.LogWarning(
            "Email delivery is not configured. Verification email to {Email} was not sent. " +
            "Set App:BaseUrl and wire up a real IEmailSender implementation.",
            toEmail);

        return Task.CompletedTask;
    }
}
