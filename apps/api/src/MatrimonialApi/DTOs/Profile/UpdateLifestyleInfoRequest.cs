using MatrimonialApi.Models.Enums;

namespace MatrimonialApi.DTOs.Profile;

public class UpdateLifestyleInfoRequest
{
    public DietType? Diet { get; set; }
    public SmokingHabit? Smoking { get; set; }
    public List<string> Hobbies { get; set; } = [];
}
