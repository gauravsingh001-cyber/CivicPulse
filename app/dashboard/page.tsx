"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIssues } from "@/hooks/useIssues";
import { useGeolocation } from "@/hooks/useGeolocation";
import { IssueFilter, IssueCategory, IssueStatus } from "@/types";
import type { AIInsight } from "@/types";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "@/lib/gamification";
import IssueCard from "@/components/IssueCard";
import AIInsightPanel from "@/components/AIInsightPanel";
import {
  Search,
  RefreshCw,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

function getDistanceKm(lat1: number, lon1: number, lat2?: number, lon2?: number) {
  if (!lat2 || !lon2) return Number.POSITIVE_INFINITY;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function DashboardPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<IssueFilter>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");

  const { issues: firestoreIssues, loading } = useIssues({
    ...filters,
    searchQuery,
  });
  const { location, requestLocationOnLoad } = useGeolocation();

  useEffect(() => {
    requestLocationOnLoad();
  }, [requestLocationOnLoad]);

  const issues = useMemo(() => {
    if (!location) return firestoreIssues;

    const nearby = firestoreIssues
      .map((issue) => ({
        ...issue,
        distanceKm: getDistanceKm(
          location.lat,
          location.lng,
          issue.location?.lat,
          issue.location?.lng
        ),
      }))
      .filter((issue) => issue.distanceKm <= 20)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return nearby.length > 0 ? nearby : firestoreIssues;
  }, [firestoreIssues, location]);

  const [mapBounds, setMapBounds] = useState<{
    southWest: { lat: number; lng: number };
    northEast: { lat: number; lng: number };
  } | null>(null);

  const visibleIssues = useMemo(() => {
    if (activeTab === "list" || !mapBounds) return issues;
    return issues.filter((issue) => {
      const lat = issue.location?.lat;
      const lng = issue.location?.lng;
      if (!lat || !lng) return false;
      return (
        lat >= mapBounds.southWest.lat &&
        lat <= mapBounds.northEast.lat &&
        lng >= mapBounds.southWest.lng &&
        lng <= mapBounds.northEast.lng
      );
    });
  }, [issues, mapBounds, activeTab]);

  const mapCenter = useMemo<[number, number]>(() => {
    const hasNearby = firestoreIssues.some((issue) => {
      if (!location || !issue.location?.lat || !issue.location?.lng) return false;
      const d = getDistanceKm(location.lat, location.lng, issue.location.lat, issue.location.lng);
      return d <= 20;
    });

    if (location && hasNearby) {
      return [location.lat, location.lng];
    }

    if (firestoreIssues.length > 0) {
      const latest = firestoreIssues[0];
      if (latest.location?.lat && latest.location?.lng) {
        return [latest.location.lat, latest.location.lng];
      }
    }

    return location ? [location.lat, location.lng] : [20.5937, 78.9629];
  }, [firestoreIssues, location]);

  const mapZoom = useMemo<number>(() => {
    const hasNearby = firestoreIssues.some((issue) => {
      if (!location || !issue.location?.lat || !issue.location?.lng) return false;
      const d = getDistanceKm(location.lat, location.lng, issue.location.lat, issue.location.lng);
      return d <= 20;
    });

    if (location && hasNearby) {
      return 13;
    }
    if (firestoreIssues.length > 0) {
      return 12;
    }
    return location ? 13 : 5;
  }, [firestoreIssues, location]);

  const stats = {
    total: issues.length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    verified: issues.filter((i) => i.status === "verified").length,
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    setShowInsights(true);
    const { generateInsights } = await import("@/lib/gemini");
    const data = await generateInsights(issues);
    setInsights(data);
    setInsightsLoading(false);
  };

  return (
    <div style={{ padding: "24px", minHeight: "calc(100vh - 64px)" }}>
      {/* ==================== HEADER ==================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "4px", fontSize: "1.5rem" }}>
            Community Dashboard
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Real-time community issue tracking
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={loadInsights}
            className="btn btn-secondary btn-sm"
            disabled={insightsLoading}
          >
            {insightsLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <TrendingUp size={14} />
            )}
            AI Insights
          </button>
          <button
            onClick={() => router.push("/report")}
            className="btn btn-primary btn-sm"
          >
            <MapPin size={14} />
            Report Issue
          </button>
        </div>
      </div>

      {/* ==================== STATS BAR ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "Total Issues",
            value: stats.total,
            icon: Activity,
            color: "var(--brand-primary)",
          },
          {
            label: "Resolved",
            value: stats.resolved,
            icon: CheckCircle,
            color: "var(--brand-accent)",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            icon: Clock,
            color: "var(--brand-warning)",
          },
          {
            label: "Verified",
            value: stats.verified,
            icon: AlertCircle,
            color: "#8b5cf6",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="glass-card"
              style={{ padding: "16px", textAlign: "center" }}
            >
              <Icon
                size={20}
                style={{ color: stat.color, margin: "0 auto 8px" }}
              />
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: stat.color,
                  fontFamily: "Space Grotesk",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== AI INSIGHTS ==================== */}
      {showInsights && (
        <AIInsightPanel
          insights={insights}
          loading={insightsLoading}
          onClose={() => setShowInsights(false)}
        />
      )}

      {/* ==================== FILTERS ==================== */}
      <div
        className="glass-card"
        style={{
          padding: "14px 20px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="input"
            placeholder="Search issues, locations..."
            style={{ paddingLeft: "36px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ width: "160px" }}
          value={filters.category || ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              category: e.target.value
                ? (e.target.value as IssueCategory)
                : undefined,
            }))
          }
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: "140px" }}
          value={filters.status || ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: e.target.value
                ? (e.target.value as IssueStatus)
                : undefined,
            }))
          }
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG)
            .filter(([k]) => ["reported", "in_progress", "resolved"].includes(k))
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
        </select>

        {(filters.category || filters.status || searchQuery) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilters({});
              setSearchQuery("");
            }}
          >
            Clear
          </button>
        )}

        {/* Map/List toggle */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            background: "var(--bg-primary)",
            borderRadius: "var(--radius-full)",
            padding: "3px",
            gap: "2px",
          }}
        >
          {(["map", "list"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "5px 14px",
                borderRadius: "var(--radius-full)",
                border: "none",
                background:
                  activeTab === tab ? "var(--brand-primary)" : "transparent",
                color:
                  activeTab === tab
                    ? "white"
                    : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="dashboard-layout">
        {/* Map / List */}
        <div>
          {activeTab === "map" ? (
            <div className="map-container">
              <MapView
                issues={issues}
                center={mapCenter}
                zoom={mapZoom}
                onIssueClick={(issue) => {
                  router.push(`/issues/${issue.id}`);
                }}
                onBoundsChange={setMapBounds}
              />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "16px",
              }}
            >
              {visibleIssues.map((issue, idx) => (
                <IssueCard
                  key={`${issue.id}-${idx}`}
                  issue={issue}
                  onClick={() => router.push(`/issues/${issue.id}`)}
                />
              ))}
              {visibleIssues.length === 0 && !loading && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "60px",
                    color: "var(--text-muted)",
                  }}
                >
                  <MapPin
                    size={40}
                    style={{ margin: "0 auto 16px", opacity: 0.3 }}
                  />
                  <p>{location ? "No nearby issues found in your area yet." : "No issues found. Be the first to report one!"}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Feed */}
        <div className="issue-feed">
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              padding: "0 4px 8px",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Activity size={14} />
            Live Feed (Visible Map Area)
            <span
              style={{
                background: "var(--brand-primary)",
                color: "white",
                padding: "1px 6px",
                borderRadius: "99px",
                fontSize: "0.7rem",
              }}
            >
              {visibleIssues.length}
            </span>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div
                className="loading-spinner"
                style={{ margin: "0 auto" }}
              />
            </div>
          )}

          {visibleIssues.map((issue, idx) => (
            <IssueCard
              key={`${issue.id}-${idx}`}
              issue={issue}
              compact
              onClick={() => router.push(`/issues/${issue.id}`)}
            />
          ))}

          {visibleIssues.length === 0 && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 10px",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
              }}
            >
              No issues visible in the map area. Drag or zoom the map to discover more.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
