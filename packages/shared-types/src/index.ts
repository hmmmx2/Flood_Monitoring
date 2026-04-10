// ─────────────────────────────────────────────────────────────
// @flood/shared-types
// Shared TypeScript interfaces used by both mobile and CRM frontends
// ─────────────────────────────────────────────────────────────

// ── Core domain types ─────────────────────────────────────────

export type FloodLevel = 0 | 1 | 2 | 3;
// 0 = Dry / Normal, 1 = Watch, 2 = Warning, 3 = Critical

export type UserRole = 'admin' | 'operator' | 'viewer' | 'public';

export type AlertSeverity = 'normal' | 'watch' | 'warning' | 'critical';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

// ── Auth ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  locationLabel?: string;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponseDto {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface VerifyResetCodeDto {
  email: string;
  code: string;
}

export interface ResetPasswordDto {
  email: string;
  newPassword: string;
}

// ── Sensor Nodes ──────────────────────────────────────────────

export interface SensorNode {
  id: string;
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  currentLevel: FloodLevel;
  isDead: boolean;
  area: string;
  location: string;
  state: string;
  lastUpdated?: string;
}

export interface SensorNodeDto {
  id: string;
  name: string;
  status: 'active' | 'warning' | 'inactive';
  distance: string;               // e.g. "3.4 km"
  coordinate: [number, number];   // [longitude, latitude]
  area: string;
  location: string;
  state: string;
  currentLevel: FloodLevel;
  lastUpdated?: string;
}

export interface FavouriteNode extends SensorNodeDto {
  favouritedAt: string;
}

// ── Feed / Events ─────────────────────────────────────────────

export interface FeedItemDto {
  id: string;
  kind: 'alert' | 'update';
  severity: AlertSeverity;
  title: string;
  sensorId: string;
  sensorName: string;
  waterLevelMeters: number;
  createdAt: string;
}

export interface FeedPageDto {
  items: FeedItemDto[];
  nextCursor?: string;
  hasMore: boolean;
}

// ── Analytics ─────────────────────────────────────────────────

export interface StatCardDto {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface WaterLevelByNode {
  nodeId: string;
  name: string;
  level: FloodLevel;
}

export interface FloodByState {
  state: string;
  count: number;
}

export interface AnalyticsDto {
  stats: StatCardDto[];
  chartData: ChartDataPoint[];          // last 7 days
  yearlyChartData: ChartDataPoint[];    // last 5 months
  waterLevelByNode: WaterLevelByNode[];
  floodByState: FloodByState[];
  recentEvents: FeedItemDto[];
}

// ── Dashboard ─────────────────────────────────────────────────

export interface DashboardNodeRowDto {
  id: string;
  nodeId: string;
  name: string;
  area: string;
  level: string;        // "0.0m" | "1.0m" | "2.5m" | "4.0m"
  status: 'Normal' | 'Watch' | 'Warning' | 'Critical' | 'Offline';
  update: string;       // "2m ago"
  timestamp: string;   // "02:15 PM"
}

export interface TimeSeriesPoint {
  month: string;
  alerts: number;
  normal: number;
}

export interface DashboardTimeSeriesDto {
  monthly: TimeSeriesPoint[];
  yearly: TimeSeriesPoint[];
}

// ── User Profile + Settings ───────────────────────────────────

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locationLabel?: string;
  avatarUrl?: string;
}

export interface UserSettingDto {
  key: string;
  label: string;
  enabled: boolean;
}

export interface UpdateSettingDto {
  key: string;
  enabled: boolean;
}

// ── Blogs ─────────────────────────────────────────────────────

export interface BlogDto {
  id: string;
  imageKey: string;
  title: string;
  body: string;
  isFeatured: boolean;
  createdAt: string;
}

// ── New Features ──────────────────────────────────────────────

// SCRUM-103: Safety Awareness
export interface SafetyContent {
  id: string;
  section: string;
  lang: string;
  content: string;
  updatedAt: string;
}

// SCRUM-104: Emergency Broadcasts
export interface Broadcast {
  id: string;
  title: string;
  body: string;
  targetZone: string;
  severity: AlertSeverity;
  sentBy: string;
  sentAt: string;
  recipientCount: number;
}

export interface CreateBroadcastDto {
  title: string;
  body: string;
  targetZone: string;
  severity: AlertSeverity;
}

// SCRUM-105: Incident Reports
export interface IncidentReport {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  severity: AlertSeverity;
  description?: string;
  photoUrl?: string;
  status: ReportStatus;
  submittedAt: string;
}

export interface CreateIncidentReportDto {
  latitude: number;
  longitude: number;
  severity: AlertSeverity;
  description?: string;
  photoUrl?: string;
}

// SCRUM-106: Flood Risk Zones
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface FloodZone {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  boundary: GeoJsonPolygon;
  activeSensorCount: number;
  lastFloodDate?: string;
  floodFrequency12m: number;
}

// SCRUM-107: IoT Ingest
export interface IngestPayload {
  nodeId: string;
  level: FloodLevel;
  timestamp: string;
  waterLevelMeters?: number;
  temperature?: number;
  humidity?: number;
  latitude?: number;
  longitude?: number;
}

export interface IngestResponseDto {
  received: boolean;
  nodeId: string;
  alertFired: boolean;
}

// SCRUM-112: Favourite Nodes
export interface ToggleFavouriteDto {
  nodeId: string;
}
