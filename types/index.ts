// ==================== ENUMS ====================
export type IssueCategory =
  | "pothole"
  | "water_leakage"
  | "streetlight"
  | "waste_management"
  | "road_damage"
  | "drainage"
  | "public_property"
  | "other";

export type IssueSeverity = 1 | 2 | 3 | 4 | 5;

export type IssueStatus =
  | "reported"
  | "verified"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

export type Department =
  | "PWD"
  | "Municipal Corporation"
  | "Electricity Board"
  | "Water Supply Board"
  | "Sanitation Department"
  | "Traffic Police"
  | "General Administration";

// ==================== LOCATION ====================
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  ward?: string;
  city?: string;
  pincode?: string;
}

// ==================== MEDIA ====================
export interface MediaItem {
  url: string;
  type: "image" | "video";
  thumbnailUrl?: string;
}

// ==================== AI ANALYSIS ====================
export interface AIAnalysis {
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  tags: string[];
  suggestedDepartment: Department;
  confidence: number;
}

// ==================== COMMENT ====================
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number; // timestamp ms
  isOfficial: boolean;
}

// ==================== STATUS HISTORY ====================
export interface StatusUpdate {
  status: IssueStatus;
  updatedBy: string;
  updatedByName: string;
  note?: string;
  timestamp: number;
  imageUrl?: string;
}

// ==================== ISSUE ====================
export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  location: GeoLocation;
  media: MediaItem[];
  reportedBy: string;
  reportedByName: string;
  reportedByAvatar?: string;
  verifiedBy: string[];
  upvotes: number;
  upvotedBy: string[];
  department: Department;
  assignedTo?: string;
  aiAnalysis?: AIAnalysis;
  comments: Comment[];
  statusHistory: StatusUpdate[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

// ==================== USER ====================
export type UserLevel =
  | "Citizen"
  | "Active Citizen"
  | "Community Guardian"
  | "City Hero";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  points: number;
  level: UserLevel;
  badges: Badge[];
  streak: number;
  lastReportDate?: number;
  issuesReported: number;
  issuesVerified: number;
  issuesResolved: number;
  createdAt: number;
  reportedCount?: number;
  resolvedCount?: number;
  verifiedCount?: number;
  inProgressCount?: number;
  assignedCount?: number;
}

// ==================== GAMIFICATION ====================
export interface PointEvent {
  type:
    | "report_issue"
    | "issue_verified"
    | "issue_resolved"
    | "verify_issue"
    | "comment"
    | "streak_bonus";
  points: number;
  description: string;
}

// ==================== DASHBOARD STATS ====================
export interface DashboardStats {
  totalIssues: number;
  resolvedIssues: number;
  inProgressIssues: number;
  verifiedIssues: number;
  avgResolutionDays: number;
  topCategory: IssueCategory;
  thisWeekReports: number;
}

// ==================== AI INSIGHT ====================
export interface HotspotPrediction {
  location: GeoLocation;
  predictedCategory: IssueCategory;
  probability: number;
  reasoning: string;
}

export interface AIInsight {
  hotspots: HotspotPrediction[];
  trendAnalysis: string;
  recommendations: string[];
  generatedAt: number;
}

// ==================== FILTER ====================
export interface IssueFilter {
  category?: IssueCategory;
  status?: IssueStatus;
  severity?: IssueSeverity;
  dateRange?: { from: number; to: number };
  ward?: string;
  searchQuery?: string;
}
