namespace MatrimonialApi.Models.Enums;

public enum ProfileStatus { Draft, PendingReview, Active, Paused, Deleted }

public enum Gender { Male, Female }

public enum Religion { Islam, Hinduism, Christianity, Buddhism, Other }

public enum IslamicSect { Sunni, Shia, Other }

public enum MaritalStatus { NeverMarried, Divorced, Widowed, Separated }

public enum EmploymentType { Employed, SelfEmployed, BusinessOwner, Student, Unemployed }

public enum EducationLevel
{
    BelowSSC,
    SSC,
    HSC,
    Diploma,
    Bachelor,
    Masters,
    PhD,
    PostDoc
}

public enum BodyType { Slim, Average, Athletic, Heavy }

public enum Complexion { VeryFair, Fair, Wheatish, Dark }

public enum FamilyStatus { LowerClass, MiddleClass, UpperMiddleClass, Rich }

public enum FamilyType { Nuclear, Joint }

public enum PrayerHabit { FiveTimes, Sometimes, Rarely, Never }

public enum DietType { HalalOnly, Vegetarian, NonVegetarian, Other }

public enum SmokingHabit { Never, Occasionally, Regularly }
