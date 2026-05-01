namespace MatrimonialApi.Email;

/// <summary>
/// Abstraction over email delivery. Swap implementations per environment.
/// Production: inject SendGrid, SES, Postmark, etc.
/// Development: DevEmailSender logs the link to the console.
/// </summary>
public interface IEmailSender
{
    Task SendVerificationEmailAsync(string toEmail, string verificationUrl, CancellationToken ct = default);
}
