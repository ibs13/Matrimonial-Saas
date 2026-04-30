using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Admin;

public class AdminActionResponse
{
    public Guid ProfileId { get; set; }
    public string Action { get; set; } = string.Empty;
    public ProfileStatus NewStatus { get; set; }
}
