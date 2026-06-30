import {
  IssueCategory,
  IssueSeverity,
  Department,
  UserLevel,
  Badge,
  PointEvent,
} from "@/types";

// ==================== CATEGORY CONFIG ====================
export const CATEGORY_CONFIG: Record<
  IssueCategory,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  pothole: {
    label: "Pothole",
    icon: "🕳️",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.15)",
  },
  water_leakage: {
    label: "Water Leakage",
    icon: "💧",
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.15)",
  },
  streetlight: {
    label: "Streetlight",
    icon: "💡",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.15)",
  },
  waste_management: {
    label: "Waste",
    icon: "🗑️",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.15)",
  },
  road_damage: {
    label: "Road Damage",
    icon: "🚧",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.15)",
  },
  drainage: {
    label: "Drainage",
    icon: "🌊",
    color: "#06b6d4",
    bgColor: "rgba(6,182,212,0.15)",
  },
  public_property: {
    label: "Public Property",
    icon: "🏛️",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.15)",
  },
  other: {
    label: "Other",
    icon: "⚠️",
    color: "#6b7280",
    bgColor: "rgba(107,114,128,0.15)",
  },
};

// ==================== SEVERITY CONFIG ====================
export const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { label: string; color: string; bgColor: string }
> = {
  1: { label: "Very Low", color: "#10b981", bgColor: "rgba(16,185,129,0.15)" },
  2: { label: "Low", color: "#84cc16", bgColor: "rgba(132,204,22,0.15)" },
  3: {
    label: "Medium",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.15)",
  },
  4: { label: "High", color: "#f97316", bgColor: "rgba(249,115,22,0.15)" },
  5: {
    label: "Critical",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.15)",
  },
};

// ==================== STATUS CONFIG ====================
export const STATUS_CONFIG = {
  reported: {
    label: "Reported",
    color: "#6b7280",
    bgColor: "rgba(107,114,128,0.15)",
    step: 0,
  },
  verified: {
    label: "Verified",
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.15)",
    step: 1,
  },
  assigned: {
    label: "Assigned",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.15)",
    step: 2,
  },
  in_progress: {
    label: "In Progress",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.15)",
    step: 3,
  },
  resolved: {
    label: "Resolved",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.15)",
    step: 4,
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.15)",
    step: -1,
  },
};

// ==================== DEPARTMENT CONFIG ====================
export const DEPARTMENT_BY_CATEGORY: Record<IssueCategory, Department> = {
  pothole: "PWD",
  road_damage: "PWD",
  water_leakage: "Water Supply Board",
  drainage: "Water Supply Board",
  streetlight: "Electricity Board",
  waste_management: "Sanitation Department",
  public_property: "Municipal Corporation",
  other: "General Administration",
};

// ==================== POINT EVENTS ====================
export const POINT_EVENTS: Record<string, PointEvent> = {
  report_issue: {
    type: "report_issue",
    points: 5,
    description: "Reported a community issue",
  },
  issue_verified: {
    type: "issue_verified",
    points: 15,
    description: "Your issue was verified by the community",
  },
  issue_in_progress: {
    type: "issue_in_progress",
    points: 5,
    description: "Your issue is in progress",
  },
  issue_resolved: {
    type: "issue_resolved",
    points: 5,
    description: "Your reported issue was resolved!",
  },
  verify_issue: {
    type: "verify_issue",
    points: 5,
    description: "Verified a community issue",
  },
  comment: {
    type: "comment",
    points: 2,
    description: "Added a comment to an issue",
  },
  streak_bonus: {
    type: "streak_bonus",
    points: 20,
    description: "7-day reporting streak bonus!",
  },
};

// ==================== LEVEL CONFIG ====================
export const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  Citizen: 0,
  "Active Citizen": 100,
  "Community Guardian": 500,
  "City Hero": 1000,
};

export const LEVEL_COLORS: Record<UserLevel, string> = {
  Citizen: "#6b7280",
  "Active Citizen": "#3b82f6",
  "Community Guardian": "#8b5cf6",
  "City Hero": "#f59e0b",
};

export const LEVEL_ICONS: Record<UserLevel, string> = {
  Citizen: "👤",
  "Active Citizen": "⭐",
  "Community Guardian": "🛡️",
  "City Hero": "🏆",
};

// ==================== BADGE DEFINITIONS ====================
export const BADGE_DEFINITIONS: Record<string, Omit<Badge, "earnedAt">> = {
  first_report: {
    id: "first_report",
    name: "First Reporter",
    description: "Reported your first community issue",
    icon: "🎯",
  },
  verified_citizen: {
    id: "verified_citizen",
    name: "Verified Citizen",
    description: "Your issue was verified by the community",
    icon: "✅",
  },
  problem_solver: {
    id: "problem_solver",
    name: "Problem Solver",
    description: "Had 5 issues successfully resolved",
    icon: "🔧",
  },
  community_champion: {
    id: "community_champion",
    name: "Community Champion",
    description: "Verified 20 community issues",
    icon: "🏅",
  },
  streak_master: {
    id: "streak_master",
    name: "Streak Master",
    description: "Maintained a 7-day reporting streak",
    icon: "🔥",
  },
  city_hero: {
    id: "city_hero",
    name: "City Hero",
    description: "Reached City Hero level (1000+ points)",
    icon: "🦸",
  },
};

// ==================== GAMIFICATION FUNCTIONS ====================
export function getLevelFromPoints(points: number): UserLevel {
  if (points >= 1000) return "City Hero";
  if (points >= 500) return "Community Guardian";
  if (points >= 100) return "Active Citizen";
  return "Citizen";
}

export function getNextLevelThreshold(level: UserLevel): number {
  const levels: UserLevel[] = [
    "Citizen",
    "Active Citizen",
    "Community Guardian",
    "City Hero",
  ];
  const idx = levels.indexOf(level);
  if (idx === levels.length - 1) return LEVEL_THRESHOLDS["City Hero"];
  return LEVEL_THRESHOLDS[levels[idx + 1]];
}

export function getLevelProgress(points: number): number {
  const level = getLevelFromPoints(points);
  const current = LEVEL_THRESHOLDS[level];
  const next = getNextLevelThreshold(level);
  if (next === current) return 100;
  return Math.min(100, Math.round(((points - current) / (next - current)) * 100));
}

export function checkNewBadges(
  issuesReported: number,
  issuesVerified: number,
  issuesResolved: number,
  streak: number,
  points: number,
  existingBadgeIds: string[]
): Badge[] {
  const newBadges: Badge[] = [];
  const now = Date.now();

  const add = (id: string) => {
    if (!existingBadgeIds.includes(id) && BADGE_DEFINITIONS[id]) {
      newBadges.push({ ...BADGE_DEFINITIONS[id], earnedAt: now });
    }
  };

  if (issuesReported >= 1) add("first_report");
  if (issuesVerified >= 20) add("community_champion");
  if (issuesResolved >= 5) add("problem_solver");
  if (streak >= 7) add("streak_master");
  if (points >= 1000) add("city_hero");

  return newBadges;
}
