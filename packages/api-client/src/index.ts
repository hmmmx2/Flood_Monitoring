// ─────────────────────────────────────────────────────────────
// @flood/api-client
// Multi-backend Axios clients for Flood Monitoring System
//
// Backend A: Java Spring Boot API  (port 3001)
//   → Used by: mobile app (all endpoints)
//   → Used by: CRM BFF (proxied via Next.js API routes)
//
// Backend B: CRM BFF Next.js API routes  (same origin)
//   → Used by: CRM frontend only (CRM-specific operations)
//
// Safe for concurrent requests:
//   - Each client instance is stateless (no shared mutable state)
//   - React Query handles deduplication on the frontend
//   - Access token is attached per-request (not stored in module scope)
// ─────────────────────────────────────────────────────────────

import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RefreshResponseDto,
  ForgotPasswordRequestDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
  SensorNodeDto,
  FeedPageDto,
  FeedItemDto,
  AnalyticsDto,
  DashboardNodeRowDto,
  DashboardTimeSeriesDto,
  BlogDto,
  AuthUser,
  UpdateProfileDto,
  UserSettingDto,
  UpdateSettingDto,
  FavouriteNode,
  ToggleFavouriteDto,
  SafetyContent,
  Broadcast,
  CreateBroadcastDto,
  IncidentReport,
  CreateIncidentReportDto,
  FloodZone,
  IngestPayload,
  IngestResponseDto,
} from '@flood/shared-types';

// ── Token storage abstraction ─────────────────────────────────
// Callers provide getToken / setToken / clearToken so this package
// works in both React Native (SecureStore / AsyncStorage) and
// Next.js (httpOnly cookie / localStorage)

export interface TokenStore {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  setTokens(access: string, refresh: string): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

let _tokenStore: TokenStore | null = null;

export function configureTokenStore(store: TokenStore): void {
  _tokenStore = store;
}

// ── Java Spring Boot API client ───────────────────────────────

function getJavaBaseUrl(): string {
  // React Native / Expo
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  // Next.js server-side
  if (typeof process !== 'undefined' && process.env?.JAVA_API_URL) {
    return process.env.JAVA_API_URL;
  }
  // Next.js client-side public var
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return 'http://localhost:3001';
}

export const javaApi: AxiosInstance = axios.create({
  baseURL: getJavaBaseUrl(),
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token
javaApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (_tokenStore) {
    const token = await _tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — auto-refresh on 401
javaApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      _tokenStore
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await _tokenStore.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post<RefreshResponseDto>(
          `${getJavaBaseUrl()}/auth/refresh`,
          { refreshToken }
        );

        await _tokenStore.setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return javaApi(originalRequest);
      } catch {
        await _tokenStore?.clearTokens();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ── CRM BFF client (Next.js API routes, same origin) ─────────
// Used only by CRM frontend — calls /api/* routes that proxy to Java

export const crmApi: AxiosInstance = axios.create({
  baseURL: '/api',    // relative — same Next.js origin
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

crmApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (_tokenStore) {
    const token = await _tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Helper ────────────────────────────────────────────────────

function data<T>(res: AxiosResponse<T>): T {
  return res.data;
}

// ── Auth API ──────────────────────────────────────────────────

export const authApi = {
  login: (payload: LoginRequestDto) =>
    javaApi.post<LoginResponseDto>('/auth/login', payload).then(data),

  register: (payload: RegisterRequestDto) =>
    javaApi.post<LoginResponseDto>('/auth/register', payload).then(data),

  refresh: (refreshToken: string) =>
    javaApi.post<RefreshResponseDto>('/auth/refresh', { refreshToken }).then(data),

  forgotPassword: (payload: ForgotPasswordRequestDto) =>
    javaApi.post<void>('/auth/forgot-password', payload).then(data),

  verifyResetCode: (payload: VerifyResetCodeDto) =>
    javaApi.post<void>('/auth/verify-reset-code', payload).then(data),

  resetPassword: (payload: ResetPasswordDto) =>
    javaApi.post<void>('/auth/reset-password', payload).then(data),
};

// ── Sensors API ───────────────────────────────────────────────

export const sensorsApi = {
  getAll: () =>
    javaApi.get<SensorNodeDto[]>('/sensors').then(data),
};

// ── Feed API ──────────────────────────────────────────────────

export const feedApi = {
  getPage: (cursor?: string) =>
    javaApi
      .get<FeedPageDto>('/feed', { params: cursor ? { cursor } : {} })
      .then(data),

  getById: (id: string) =>
    javaApi.get<FeedItemDto>(`/feed/${id}`).then(data),
};

// ── Analytics API ─────────────────────────────────────────────

export const analyticsApi = {
  get: () =>
    javaApi.get<AnalyticsDto>('/analytics').then(data),
};

// ── Dashboard API ─────────────────────────────────────────────

export const dashboardApi = {
  getNodes: () =>
    javaApi.get<DashboardNodeRowDto[]>('/dashboard/nodes').then(data),

  getTimeSeries: () =>
    javaApi.get<DashboardTimeSeriesDto>('/dashboard/time-series').then(data),
};

// ── Blogs API ─────────────────────────────────────────────────

export const blogsApi = {
  getFeatured: () =>
    javaApi.get<BlogDto[]>('/blogs/featured').then(data),
};

// ── Profile API ───────────────────────────────────────────────

export const profileApi = {
  update: (payload: UpdateProfileDto) =>
    javaApi.patch<AuthUser>('/profile', payload).then(data),
};

// ── Settings API ──────────────────────────────────────────────

export const settingsApi = {
  get: () =>
    javaApi.get<UserSettingDto[]>('/settings').then(data),

  update: (payload: UpdateSettingDto) =>
    javaApi.patch<UserSettingDto>('/settings', payload).then(data),
};

// ── Favourites API (SCRUM-112) ────────────────────────────────

export const favouritesApi = {
  getAll: () =>
    javaApi.get<FavouriteNode[]>('/favourites').then(data),

  add: (payload: ToggleFavouriteDto) =>
    javaApi.post<FavouriteNode>('/favourites', payload).then(data),

  remove: (nodeId: string) =>
    javaApi.delete<void>(`/favourites/${nodeId}`).then(data),
};

// ── Safety Content API (SCRUM-103) ────────────────────────────

export const safetyApi = {
  getAll: (lang = 'en') =>
    javaApi.get<SafetyContent[]>('/safety', { params: { lang } }).then(data),
};

// ── Broadcasts API (SCRUM-104) ────────────────────────────────

export const broadcastsApi = {
  getAll: () =>
    javaApi.get<Broadcast[]>('/broadcasts').then(data),

  send: (payload: CreateBroadcastDto) =>
    javaApi.post<Broadcast>('/broadcasts', payload).then(data),
};

// ── Incident Reports API (SCRUM-105) ──────────────────────────

export const reportsApi = {
  getAll: () =>
    javaApi.get<IncidentReport[]>('/reports').then(data),

  create: (payload: CreateIncidentReportDto) =>
    javaApi.post<IncidentReport>('/reports', payload).then(data),

  updateStatus: (id: string, status: 'reviewed' | 'resolved') =>
    javaApi.patch<IncidentReport>(`/reports/${id}/status`, { status }).then(data),
};

// ── Flood Zones API (SCRUM-106) ───────────────────────────────

export const zonesApi = {
  getAll: () =>
    javaApi.get<FloodZone[]>('/zones').then(data),

  getById: (id: string) =>
    javaApi.get<FloodZone>(`/zones/${id}`).then(data),
};

// ── IoT Ingest API (SCRUM-107) ────────────────────────────────
// Called by IoT devices / backend services — no auth required

export const ingestApi = {
  push: (payload: IngestPayload) =>
    javaApi.post<IngestResponseDto>('/ingest', payload).then(data),
};

// ── CRM-specific BFF calls ────────────────────────────────────
// These call Next.js /api/* routes which proxy to the Java API
// Only used in CRM — mobile uses javaApi directly

export const crmBff = {
  getNodes: () =>
    crmApi.get<DashboardNodeRowDto[]>('/nodes').then(data),

  getReports: () =>
    crmApi.get<IncidentReport[]>('/reports').then(data),

  getBroadcasts: () =>
    crmApi.get<Broadcast[]>('/broadcasts').then(data),

  sendBroadcast: (payload: CreateBroadcastDto) =>
    crmApi.post<Broadcast>('/broadcasts', payload).then(data),
};
