using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileMatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProfileMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    MatchLevel = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    MatchReasons = table.Column<string>(type: "text", nullable: false),
                    ScoredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileMatches_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileMatches_Pair",
                table: "ProfileMatches",
                columns: new[] { "UserId", "CandidateId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileMatches_ScoredAt",
                table: "ProfileMatches",
                column: "ScoredAt");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileMatches_UserScore",
                table: "ProfileMatches",
                columns: new[] { "UserId", "Score" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProfileMatches");
        }
    }
}
