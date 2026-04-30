using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Interest;

public class InterestListRequest
{
    /// <summary>Optional — filter by request status. Omit to return all statuses.</summary>
    public InterestRequestStatus? Status { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 50)]
    public int PageSize { get; set; } = 20;
}
