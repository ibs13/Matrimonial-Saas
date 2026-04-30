using System.ComponentModel.DataAnnotations;

namespace MatrimonialApi.DTOs.Admin;

public class PendingProfilesRequest
{
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 50)]
    public int PageSize { get; set; } = 20;
}
