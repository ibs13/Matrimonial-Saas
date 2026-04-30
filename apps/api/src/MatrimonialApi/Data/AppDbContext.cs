using MatrimonialApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MatrimonialApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ProfileIndex> ProfileIndexes => Set<ProfileIndex>();

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

            // FK to User — 1:1, cascades on user delete
            entity.HasOne<User>()
                  .WithOne()
                  .HasForeignKey<ProfileIndex>(p => p.Id)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(p => p.Status).HasMaxLength(32).IsRequired();
            entity.Property(p => p.Gender).HasMaxLength(16);
            entity.Property(p => p.Religion).HasMaxLength(32);
            entity.Property(p => p.MaritalStatus).HasMaxLength(32);
            entity.Property(p => p.CountryOfResidence).HasMaxLength(60);
            entity.Property(p => p.Division).HasMaxLength(60);
            entity.Property(p => p.EducationLevel).HasMaxLength(32);
            entity.Property(p => p.EmploymentType).HasMaxLength(32);

            // Composite index for the most common search: status + gender + religion
            entity.HasIndex(p => new { p.Status, p.Gender, p.Religion })
                  .HasDatabaseName("IX_ProfileIndex_Search_Core");

            // Range filter indexes
            entity.HasIndex(p => p.AgeYears).HasDatabaseName("IX_ProfileIndex_Age");
            entity.HasIndex(p => p.HeightCm).HasDatabaseName("IX_ProfileIndex_Height");
            entity.HasIndex(p => p.CountryOfResidence).HasDatabaseName("IX_ProfileIndex_Country");
            entity.HasIndex(p => p.UpdatedAt).HasDatabaseName("IX_ProfileIndex_UpdatedAt");
        });
    }
}
