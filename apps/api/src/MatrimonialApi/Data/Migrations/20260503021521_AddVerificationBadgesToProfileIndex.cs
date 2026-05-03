using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVerificationBadgesToProfileIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasPhone",
                table: "ProfileIndexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "ProfileIndexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsIdentityVerified",
                table: "ProfileIndexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPremiumMember",
                table: "ProfileIndexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasPhone",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "IsIdentityVerified",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "IsPremiumMember",
                table: "ProfileIndexes");
        }
    }
}
