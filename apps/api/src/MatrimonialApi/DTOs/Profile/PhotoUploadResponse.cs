namespace MatrimonialApi.DTOs.Profile;

public class PhotoUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string Visibility { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
