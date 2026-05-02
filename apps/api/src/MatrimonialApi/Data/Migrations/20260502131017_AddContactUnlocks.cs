using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContactUnlocks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactUnlocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UnlockedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactUnlocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactUnlocks_Users_ProfileUserId",
                        column: x => x.ProfileUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContactUnlocks_Users_UnlockedByUserId",
                        column: x => x.UnlockedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContactUnlocks_Pair",
                table: "ContactUnlocks",
                columns: new[] { "UnlockedByUserId", "ProfileUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContactUnlocks_Profile",
                table: "ContactUnlocks",
                columns: new[] { "ProfileUserId", "UnlockedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContactUnlocks_Unlocker",
                table: "ContactUnlocks",
                columns: new[] { "UnlockedByUserId", "UnlockedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactUnlocks");
        }
    }
}
