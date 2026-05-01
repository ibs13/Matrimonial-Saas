namespace MatrimonialApi.DTOs.Admin;

public class PendingPhotoItem
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public string Visibility { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
