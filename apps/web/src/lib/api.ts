import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  MeResponse,
  ProfileResponse,
  BasicInfo,
  PhysicalInfo,
  EducationInfo,
  CareerInfo,
  FamilyInfo,
  ReligionInfo,
  LifestyleInfo,
  PartnerExpectations,
  ContactInfo,
  ProfileVisibility,
  SearchProfilesRequest,
  SearchResponse,
  SendInterestRequest,
  InterestRequestResponse,
  InterestListResponse,
  PendingProfilesResponse,
  AdminProfileDetailResponse,
  AdminActionResponse,
  AuditLogListResponse,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const http: AxiosInstance = axios.create({ baseURL: BASE_URL });

// ── Request interceptor: attach access token ──────────────────────────────────

http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: refresh on 401 ──────────────────────────────────────

let refreshing: Promise<void> | null = null;

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original: AxiosRequestConfig & { _retry?: boolean } = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = (async () => {
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('no refresh token');

            const { data } = await axios.post<AuthResponse>(`${BASE_URL}/api/auth/refresh`, {
              refreshToken,
            });

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw error;
          } finally {
            refreshing = null;
          }
        })();
      }

      await refreshing;
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      return http(original);
    }

    return Promise.reject(error);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    http.post<AuthResponse>('/api/auth/login', { email, password }).then((r) => r.data),

  register: (email: string, password: string) =>
    http.post<AuthResponse>('/api/auth/register', { email, password }).then((r) => r.data),

  logout: (refreshToken: string) =>
    http.post('/api/auth/logout', { refreshToken }),

  me: () => http.get<MeResponse>('/api/auth/me').then((r) => r.data),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  create: () => http.post<ProfileResponse>('/api/profile').then((r) => r.data),

  getMe: () => http.get<ProfileResponse>('/api/profile/me').then((r) => r.data),

  updateBasic: (data: Partial<BasicInfo> & { displayName: string; gender: string; dateOfBirth: string; religion: string; maritalStatus: string; countryOfResidence: string }) =>
    http.patch<ProfileResponse>('/api/profile/basic', data).then((r) => r.data),

  updatePhysical: (data: Partial<PhysicalInfo>) =>
    http.patch<ProfileResponse>('/api/profile/physical', data).then((r) => r.data),

  updateEducation: (data: Partial<EducationInfo> & { level: string }) =>
    http.patch<ProfileResponse>('/api/profile/education', data).then((r) => r.data),

  updateCareer: (data: Partial<CareerInfo> & { employmentType: string }) =>
    http.patch<ProfileResponse>('/api/profile/career', data).then((r) => r.data),

  updateFamily: (data: Partial<FamilyInfo>) =>
    http.patch<ProfileResponse>('/api/profile/family', data).then((r) => r.data),

  updateReligion: (data: Partial<ReligionInfo>) =>
    http.patch<ProfileResponse>('/api/profile/religion', data).then((r) => r.data),

  updateLifestyle: (data: Partial<LifestyleInfo>) =>
    http.patch<ProfileResponse>('/api/profile/lifestyle', data).then((r) => r.data),

  updatePartnerExpectations: (data: Partial<PartnerExpectations>) =>
    http.patch<ProfileResponse>('/api/profile/partner-expectations', data).then((r) => r.data),

  updateContact: (data: Partial<ContactInfo>) =>
    http.patch<ProfileResponse>('/api/profile/contact', data).then((r) => r.data),

  updateVisibility: (data: Partial<ProfileVisibility>) =>
    http.patch<ProfileResponse>('/api/profile/visibility', data).then((r) => r.data),

  submitForReview: () => http.post<ProfileResponse>('/api/profile/submit').then((r) => r.data),
};

// ── Search ────────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (data: SearchProfilesRequest) =>
    http.post<SearchResponse>('/api/search', data).then((r) => r.data),
};

// ── Interests ─────────────────────────────────────────────────────────────────

export const interestApi = {
  send: (data: SendInterestRequest) =>
    http.post<InterestRequestResponse>('/api/interests', data).then((r) => r.data),

  getSent: (params: { page?: number; pageSize?: number; status?: string }) =>
    http.get<InterestListResponse>('/api/interests/sent', { params }).then((r) => r.data),

  getReceived: (params: { page?: number; pageSize?: number; status?: string }) =>
    http.get<InterestListResponse>('/api/interests/received', { params }).then((r) => r.data),

  cancel: (id: string) => http.delete(`/api/interests/${id}`),

  accept: (id: string) =>
    http.patch<InterestRequestResponse>(`/api/interests/${id}/accept`).then((r) => r.data),

  reject: (id: string) =>
    http.patch<InterestRequestResponse>(`/api/interests/${id}/reject`).then((r) => r.data),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  getPendingProfiles: (params: { page?: number; pageSize?: number }) =>
    http.get<PendingProfilesResponse>('/api/admin/profiles/pending', { params }).then((r) => r.data),

  getProfileDetail: (id: string) =>
    http.get<AdminProfileDetailResponse>(`/api/admin/profiles/${id}`).then((r) => r.data),

  approveProfile: (id: string) =>
    http.patch<AdminActionResponse>(`/api/admin/profiles/${id}/approve`).then((r) => r.data),

  rejectProfile: (id: string, reason: string) =>
    http.patch<AdminActionResponse>(`/api/admin/profiles/${id}/reject`, { reason }).then((r) => r.data),

  suspendProfile: (id: string, reason: string) =>
    http.patch<AdminActionResponse>(`/api/admin/profiles/${id}/suspend`, { reason }).then((r) => r.data),

  getAuditLogs: (params: { page?: number; pageSize?: number; action?: string; entityId?: string }) =>
    http.get<AuditLogListResponse>('/api/admin/audit-logs', { params }).then((r) => r.data),
};
