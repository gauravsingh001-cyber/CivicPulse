"use client";

import { AIInsight } from "@/types";
import { CATEGORY_CONFIG } from "@/lib/gamification";
import { X, Brain, TrendingUp, MapPin, Lightbulb } from "lucide-react";

interface AIInsightPanelProps {
  insights: AIInsight | null;
  loading: boolean;
  onClose: () => void;
}

export default function AIInsightPanel({
  insights,
  loading,
  onClose,
}: AIInsightPanelProps) {
  return (
    <div
      className="glass-card animate-fadeInUp"
      style={{
        marginBottom: "20px",
        padding: "20px 24px",
        borderColor: "rgba(124,58,237,0.3)",
        background: "rgba(124,58,237,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(124,58,237,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={16} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "var(--text-primary)",
              }}
            >
              Gemini AI Insights
            </div>
            <div style={{ fontSize: "0.7rem", color: "#a78bfa" }}>
              Predictive community analysis
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-icon">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
          <div className="loading-spinner" style={{ width: "24px", height: "24px", borderWidth: "2px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Gemini is analyzing community patterns...
          </p>
        </div>
      ) : insights ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Trend Analysis */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "10px",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <TrendingUp size={14} />
              Trend Analysis
            </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
              {insights.trendAnalysis}
            </p>
          </div>

          {/* Hotspots */}
          {insights.hotspots && insights.hotspots.length > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <MapPin size={14} />
                Predicted Hotspots
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {insights.hotspots.map((h, i) => {
                  const conf = CATEGORY_CONFIG[h.predictedCategory];
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.8rem",
                      }}
                    >
                      <span>{conf?.icon || "⚠️"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          {h.location.ward || h.location.address}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                          {conf?.label} — {Math.round(h.probability * 100)}% probability
                        </div>
                      </div>
                      <div
                        style={{
                          width: "40px",
                          height: "4px",
                          background: "var(--border-normal)",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${h.probability * 100}%`,
                            background: conf?.color || "var(--brand-primary)",
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Lightbulb size={14} />
                AI Recommendations
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {insights.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "8px",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span style={{ color: "var(--brand-accent)", flexShrink: 0 }}>
                      ✓
                    </span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
