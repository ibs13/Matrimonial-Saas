using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProfileIndexes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Gender = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Religion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    MaritalStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    CountryOfResidence = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    Division = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    AgeYears = table.Column<int>(type: "integer", nullable: true),
                    HeightCm = table.Column<int>(type: "integer", nullable: true),
                    EducationLevel = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    EmploymentType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CompletionPercentage = table.Column<int>(type: "integer", nullable: false),
                    LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileIndexes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileIndexes_Users_Id",
                        column: x => x.Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Age",
                table: "ProfileIndexes",
                column: "AgeYears");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Country",
                table: "ProfileIndexes",
                column: "CountryOfResidence");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Height",
                table: "ProfileIndexes",
                column: "HeightCm");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_Search_Core",
                table: "ProfileIndexes",
                columns: new[] { "Status", "Gender", "Religion" });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileIndex_UpdatedAt",
                table: "ProfileIndexes",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProfileIndexes");
        }
    }
}
