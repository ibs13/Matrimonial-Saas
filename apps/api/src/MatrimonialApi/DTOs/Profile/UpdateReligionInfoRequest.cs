using System.ComponentModel.DataAnnotations;
using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateReligionInfoRequest
{
    public IslamicSect? Sect { get; set; }
    public PrayerHabit? PrayerHabit { get; set; }
    public bool? WearsHijab { get; set; }
    public bool? WearsBeard { get; set; }

    [MaxLength(60)]
    public string? Mazhab { get; set; }
}
