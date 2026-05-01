using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MatrimonialApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterestRequests_Users_ReceiverId",
                table: "InterestRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_InterestRequests_Users_SenderId",
                table: "InterestRequests");

            migrationBuilder.AddForeignKey(
                name: "FK_InterestRequests_Users_ReceiverId",
                table: "InterestRequests",
                column: "ReceiverId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InterestRequests_Users_SenderId",
                table: "InterestRequests",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterestRequests_Users_ReceiverId",
                table: "InterestRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_InterestRequests_Users_SenderId",
                table: "InterestRequests");

            migrationBuilder.AddForeignKey(
                name: "FK_InterestRequests_Users_ReceiverId",
                table: "InterestRequests",
                column: "ReceiverId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InterestRequests_Users_SenderId",
                table: "InterestRequests",
                column: "SenderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
