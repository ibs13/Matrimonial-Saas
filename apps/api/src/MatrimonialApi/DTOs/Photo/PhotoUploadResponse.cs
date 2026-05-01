using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Photo;

public class PhotoUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public PhotoVisibility Visibility { get; set; }
    public PhotoStatus Status { get; set; }
    public DateTime UploadedAt { get; set; }
}
