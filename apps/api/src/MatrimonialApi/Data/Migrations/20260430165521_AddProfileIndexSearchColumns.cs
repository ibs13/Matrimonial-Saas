using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileIndexSearchColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_Country",
                table: "ProfileIndexes");

            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_Search_Core",
                table: "ProfileIndexes");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "ProfileIndexes",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "ProfileIndexes",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EducationLevelOrder",
                table: "ProfileIndexes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ProfileVisible",
                table: "ProfileIndexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_EducationOrder",
                table: "ProfileIndexes",
                column: "EducationLevelOrder");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_LastActive",
                table: "ProfileIndexes",
                column: "LastActiveAt");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Location",
                table: "ProfileIndexes",
                columns: new[] { "CountryOfResidence", "Division", "District" });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Search_Core",
                table: "ProfileIndexes",
                columns: new[] { "Status", "ProfileVisible", "Gender", "Religion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_EducationOrder",
                table: "ProfileIndexes");

            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_LastActive",
                table: "ProfileIndexes");

            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_Location",
                table: "ProfileIndexes");

            migrationBuilder.DropIndex(
                name: "IX_ProfileIndex_Search_Core",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "District",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "EducationLevelOrder",
                table: "ProfileIndexes");

            migrationBuilder.DropColumn(
                name: "ProfileVisible",
                table: "ProfileIndexes");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Country",
                table: "ProfileIndexes",
                column: "CountryOfResidence");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Search_Core",
                table: "ProfileIndexes",
                columns: new[] { "Status", "Gender", "Religion" });
        }
    }
}
