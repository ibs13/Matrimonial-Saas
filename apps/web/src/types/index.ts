// ── Enums ──────────────────────────────────────────────────────────────────────

export type ProfileStatus = 'Draft' | 'PendingReview' | 'Active' | 'Paused' | 'Deleted';
export type Gender = 'Male' | 'Female';
export type Religion = 'Islam' | 'Hinduism' | 'Christianity' | 'Buddhism' | 'Other';
export type IslamicSect = 'Sunni' | 'Shia' | 'Other';
export type MaritalStatus = 'NeverMarried' | 'Divorced' | 'Widowed' | 'Separated';
export type EmploymentType = 'Employed' | 'SelfEmployed' | 'BusinessOwner' | 'Student' | 'Unemployed';
export type EducationLevel = 'BelowSSC' | 'SSC' | 'HSC' | 'Diploma' | 'Bachelor' | 'Masters' | 'PhD' | 'PostDoc';
export type BodyType = 'Slim' | 'Average' | 'Athletic' | 'Heavy';
export type Complexion = 'VeryFair' | 'Fair' | 'Wheatish' | 'Dark';
export type FamilyStatus = 'LowerClass' | 'MiddleClass' | 'UpperMiddleClass' | 'Rich';
export type FamilyType = 'Nuclear' | 'Joint';
export type PrayerHabit = 'FiveTimes' | 'Sometimes' | 'Rarely' | 'Never';
export type DietType = 'HalalOnly' | 'Vegetarian' | 'NonVegetarian' | 'Other';
export type SmokingHabit = 'Never' | 'Occasionally' | 'Regularly';
export type InterestRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
export type SearchSortBy = 'LastActive' | 'Newest' | 'Completion';
export type PhotoVisibility = 'Public' | 'ApprovedUsersOnly' | 'Hidden';
export type PhotoStatus = 'Pending' | 'Approved' | 'Rejected';

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  role: string;
  isEmailVerified: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ProfileVisibility {
  showFullName: boolean;
  showPhone: boolean;
  showAddress: boolean;
  profileVisible: boolean;
}

export interface BasicInfo {
  displayName: string;
  fullName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  religion?: Religion;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  motherTongue?: string;
  countryOfResidence?: string;
  division?: string;
  district?: string;
  aboutMe?: string;
}

export interface PhysicalInfo {
  heightCm?: number;
  weightKg?: number;
  bodyType?: BodyType;
  complexion?: Complexion;
  bloodGroup?: string;
  hasPhysicalDisability?: boolean;
  physicalDisabilityDetails?: string;
}

export interface EducationInfo {
  level?: EducationLevel;
  fieldOfStudy?: string;
  institution?: string;
  graduationYear?: number;
  additionalQualifications?: string;
}

export interface CareerInfo {
  employmentType?: EmploymentType;
  occupation?: string;
  organization?: string;
  annualIncome?: number;
  incomeCurrency?: string;
}

export interface FamilyInfo {
  fatherOccupation?: string;
  motherOccupation?: string;
  numberOfBrothers?: number;
  numberOfSisters?: number;
  familyStatus?: FamilyStatus;
  familyType?: FamilyType;
  familyCountry?: string;
  familyDivision?: string;
  familyDistrict?: string;
  aboutFamily?: string;
}

export interface ReligionInfo {
  sect?: IslamicSect;
  prayerHabit?: PrayerHabit;
  wearsHijab?: boolean;
  wearsBeard?: boolean;
  mazhab?: string;
}

export interface LifestyleInfo {
  diet?: DietType;
  smoking?: SmokingHabit;
  hobbies?: string[];
}

export interface PartnerExpectations {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  minEducationLevel?: EducationLevel;
  acceptedMaritalStatuses?: MaritalStatus[];
  acceptedReligions?: Religion[];
  preferredCountries?: string[];
  minFamilyStatus?: FamilyStatus;
  additionalExpectations?: string;
}

export interface ProfilePhoto {
  url: string;
  visibility: PhotoVisibility;
  status: PhotoStatus;
  uploadedAt: string;
}

export interface ContactInfo {
  phone?: string;
  guardianPhone?: string;
  presentAddress?: string;
  permanentAddress?: string;
}

export interface ProfileCompletionField {
  field: string;
  label: string;
  isRequired: boolean;
}

export interface ProfileResponse {
  id: string;
  status: ProfileStatus;
  visibility: ProfileVisibility;
  completionPercentage: number;
  ageYears?: number;
  basic?: BasicInfo;
  physical?: PhysicalInfo;
  education?: EducationInfo;
  career?: CareerInfo;
  family?: FamilyInfo;
  religion?: ReligionInfo;
  lifestyle?: LifestyleInfo;
  partnerExpectations?: PartnerExpectations;
  photos?: ProfilePhoto[];
  contact?: ContactInfo;
  missingFields?: ProfileCompletionField[];
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchProfilesRequest {
  gender?: Gender;
  religion?: Religion;
  maritalStatuses?: MaritalStatus[];
  countryOfResidence?: string;
  division?: string;
  district?: string;
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  minEducationLevel?: EducationLevel;
  employmentTypes?: EmploymentType[];
  sortBy?: SearchSortBy;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  userId: string;
  displayName: string;
  gender?: string;
  ageYears?: number;
  religion?: string;
  maritalStatus?: string;
  countryOfResidence?: string;
  division?: string;
  district?: string;
  educationLevel?: string;
  employmentType?: string;
  heightCm?: number;
  completionPercentage: number;
  lastActiveAt?: string;
  photoUrl?: string;
}

export interface SearchResponse {
  items: SearchResultItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Interests ─────────────────────────────────────────────────────────────────

export interface SendInterestRequest {
  receiverId: string;
  message?: string;
}

export interface InterestRequestResponse {
  id: string;
  senderId: string;
  receiverId: string;
  otherUserId: string;
  otherDisplayName: string;
  otherGender?: string;
  otherAgeYears?: number;
  otherCountryOfResidence?: string;
  otherDivision?: string;
  status: string;
  message?: string;
  sentAt: string;
  respondedAt?: string;
}

export interface InterestListResponse {
  items: InterestRequestResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export type ReportReason = 'Fake' | 'Inappropriate' | 'Scam' | 'Harassment' | 'Other';

export interface SubmitReportRequest {
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reportedUserId: string;
  reportedDisplayName: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
}

export interface ReportListResponse {
  items: ReportItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ── Profile Views ─────────────────────────────────────────────────────────────

export interface ProfileViewerItem {
  viewerUserId: string;
  displayName: string;
  gender?: string;
  ageYears?: number;
  countryOfResidence?: string;
  division?: string;
  photoUrl?: string;
  viewedAt: string;
}

export interface ProfileViewersResponse {
  items: ProfileViewerItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'InterestReceived'
  | 'InterestAccepted'
  | 'InterestRejected'
  | 'ProfileApproved'
  | 'ProfileRejected'
  | 'PhotoApproved'
  | 'PhotoRejected'
  | 'ReportReviewed';

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Saved Profiles ────────────────────────────────────────────────────────────

export interface SavedProfileResponse {
  id: string;
  savedUserId: string;
  displayName: string;
  gender?: string;
  ageYears?: number;
  religion?: string;
  countryOfResidence?: string;
  division?: string;
  educationLevel?: string;
  completionPercentage: number;
  savedAt: string;
}

// ── Photos ────────────────────────────────────────────────────────────────────

export interface PendingPhotoItem {
  userId: string;
  displayName: string;
  photoUrl: string;
  visibility: string;
  uploadedAt: string;
}

export interface PendingPhotoListResponse {
  items: PendingPhotoItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface PendingProfileItem {
  id: string;
  displayName?: string;
  gender?: string;
  religion?: string;
  ageYears?: number;
  countryOfResidence?: string;
  division?: string;
  completionPercentage: number;
  submittedAt: string;
}

export interface PendingProfilesResponse {
  items: PendingProfileItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminProfileDetailResponse {
  email: string;
  profile: ProfileResponse;
}

export interface AdminActionResponse {
  profileId: string;
  action: string;
  newStatus: ProfileStatus;
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ── Membership ────────────────────────────────────────────────────────────────

export type MembershipPlan = 'Free' | 'Basic' | 'Premium' | 'Vip';

export interface UserMembershipResponse {
  plan: MembershipPlan;
  startedAt: string;
  expiresAt?: string;
  /** -1 means unlimited */
  monthlyInterestLimit: number;
  interestsSentThisMonth: number;
  advancedSearch: boolean;
  profileBoost: boolean;
  contactUnlock: boolean;
  monthlyPriceBdt: number;
}

export interface PlanDetails {
  plan: MembershipPlan;
  tagline: string;
  /** -1 means unlimited */
  monthlyInterestLimit: number;
  advancedSearch: boolean;
  profileBoost: boolean;
  contactUnlock: boolean;
  monthlyPriceBdt: number;
}

export interface RecentActivityItem {
  action: string;
  adminEmail: string;
  entityType: string;
  entityId: string;
  reason?: string;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  verifiedUsers: number;
  newUsersLast7Days: number;
  draftProfiles: number;
  pendingProfiles: number;
  approvedProfiles: number;
  suspendedProfiles: number;
  activeReports: number;
  pendingPhotos: number;
  totalInterests: number;
  acceptedInterests: number;
  recentActivity: RecentActivityItem[];
}
