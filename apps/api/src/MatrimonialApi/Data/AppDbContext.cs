using MatrimonialApi.Models;
using MatrimonialApi.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ProfileIndex> ProfileIndexes => Set<ProfileIndex>();
    public DbSet<InterestRequest> InterestRequests => Set<InterestRequest>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SavedProfile> SavedProfiles => Set<SavedProfile>();
    public DbSet<ProfileReport> ProfileReports => Set<ProfileReport>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.HasIndex(rt => rt.Token).IsUnique();
            entity.Property(rt => rt.Token).IsRequired();
            entity.HasOne(rt => rt.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileIndex>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.HasOne<User>()
                  .WithOne()
                  .HasForeignKey<ProfileIndex>(p => p.Id)
                  .OnDelete(DeleteBehavior.Cascade);

            // String column lengths
            entity.Property(p => p.DisplayName).HasMaxLength(60);
            entity.Property(p => p.Status).HasMaxLength(32).IsRequired();
            entity.Property(p => p.Gender).HasMaxLength(16);
            entity.Property(p => p.Religion).HasMaxLength(32);
            entity.Property(p => p.MaritalStatus).HasMaxLength(32);
            entity.Property(p => p.CountryOfResidence).HasMaxLength(60);
            entity.Property(p => p.Division).HasMaxLength(60);
            entity.Property(p => p.District).HasMaxLength(60);
            entity.Property(p => p.EducationLevel).HasMaxLength(32);
            entity.Property(p => p.EmploymentType).HasMaxLength(32);

            // ── Indexes ───────────────────────────────────────────────────────

            // Primary search index: every active-profile query starts with these three
            entity.HasIndex(p => new { p.Status, p.ProfileVisible, p.Gender, p.Religion })
                  .HasDatabaseName("IX_ProfileIndex_Search_Core");

            // Location drill-down
            entity.HasIndex(p => new { p.CountryOfResidence, p.Division, p.District })
                  .HasDatabaseName("IX_ProfileIndex_Location");

            // Range filter indexes (B-tree, supports < / > / BETWEEN)
            entity.HasIndex(p => p.AgeYears).HasDatabaseName("IX_ProfileIndex_Age");
            entity.HasIndex(p => p.HeightCm).HasDatabaseName("IX_ProfileIndex_Height");
            entity.HasIndex(p => p.EducationLevelOrder).HasDatabaseName("IX_ProfileIndex_EducationOrder");

            // Sort indexes
            entity.HasIndex(p => p.LastActiveAt).HasDatabaseName("IX_ProfileIndex_LastActive");
            entity.HasIndex(p => p.UpdatedAt).HasDatabaseName("IX_ProfileIndex_UpdatedAt");
        });

        modelBuilder.Entity<InterestRequest>(entity =>
        {
            entity.HasKey(r => r.Id);

            // Two FKs to User — restrict delete so user deletion doesn't silently wipe history
            entity.HasOne(r => r.Sender)
                  .WithMany()
                  .HasForeignKey(r => r.SenderId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Receiver)
                  .WithMany()
                  .HasForeignKey(r => r.ReceiverId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(r => r.Status)
                  .HasConversion<string>()
                  .HasMaxLength(32)
                  .IsRequired();

            entity.Property(r => r.Message).HasMaxLength(300);

            // Duplicate check: look up any request between two users in either direction
            entity.HasIndex(r => new { r.SenderId, r.ReceiverId })
                  .HasDatabaseName("IX_InterestRequests_Pair");

            // Efficient list queries filtered by status
            entity.HasIndex(r => new { r.SenderId, r.Status, r.SentAt })
                  .HasDatabaseName("IX_InterestRequests_Sent");

            entity.HasIndex(r => new { r.ReceiverId, r.Status, r.SentAt })
                  .HasDatabaseName("IX_InterestRequests_Received");
        });

        modelBuilder.Entity<SavedProfile>(entity =>
        {
            entity.HasKey(s => s.Id);

            entity.HasOne(s => s.User)
                  .WithMany()
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.SavedUser)
                  .WithMany()
                  .HasForeignKey(s => s.SavedUserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => new { s.UserId, s.SavedUserId })
                  .IsUnique()
                  .HasDatabaseName("IX_SavedProfiles_Unique");

            entity.HasIndex(s => new { s.UserId, s.SavedAt })
                  .HasDatabaseName("IX_SavedProfiles_User");
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.HasOne(t => t.User)
                  .WithMany()
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();

            // Lookup by hash on verify: must be unique and fast
            entity.HasIndex(t => t.TokenHash)
                  .IsUnique()
                  .HasDatabaseName("IX_EmailVerificationTokens_Hash");

            // Cleanup query: find active tokens for a user
            entity.HasIndex(t => new { t.UserId, t.UsedAt, t.ExpiresAt })
                  .HasDatabaseName("IX_EmailVerificationTokens_User");
        });

        modelBuilder.Entity<ProfileReport>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.HasOne(r => r.Reporter)
                  .WithMany()
                  .HasForeignKey(r => r.ReporterId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.ReportedUser)
                  .WithMany()
                  .HasForeignKey(r => r.ReportedUserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(r => r.Reason)
                  .HasConversion<string>()
                  .HasMaxLength(32)
                  .IsRequired();

            entity.Property(r => r.Status).HasMaxLength(16).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(500);

            // Efficient admin queue query: active reports ordered by time
            entity.HasIndex(r => new { r.Status, r.CreatedAt })
                  .HasDatabaseName("IX_ProfileReports_Status");

            // Lookup by reported user (e.g. "how many reports does this profile have?")
            entity.HasIndex(r => new { r.ReportedUserId, r.Status })
                  .HasDatabaseName("IX_ProfileReports_Reported");

            // Duplicate check: one active report per reporter per profile
            entity.HasIndex(r => new { r.ReporterId, r.ReportedUserId })
                  .HasDatabaseName("IX_ProfileReports_Reporter");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.AdminEmail).HasMaxLength(256).IsRequired();
            entity.Property(l => l.Action).HasMaxLength(64).IsRequired();
            entity.Property(l => l.EntityType).HasMaxLength(32).IsRequired();
            entity.Property(l => l.Reason).HasMaxLength(500);

            // No FK to Users — admin records persist even if the admin account is deleted
            entity.HasIndex(l => new { l.AdminId, l.CreatedAt })
                  .HasDatabaseName("IX_AuditLogs_AdminId");
            entity.HasIndex(l => new { l.EntityId, l.CreatedAt })
                  .HasDatabaseName("IX_AuditLogs_EntityId");
            entity.HasIndex(l => new { l.Action, l.CreatedAt })
                  .HasDatabaseName("IX_AuditLogs_Action");
        });
    }
}
