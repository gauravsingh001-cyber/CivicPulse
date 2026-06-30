"use client";

import { Issue } from "@/types";
import { CATEGORY_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from "@/lib/gamification";
import { MapPin, ThumbsUp, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
  compact?: boolean;
}

export default function IssueCard({ issue, onClick, compact }: IssueCardProps) {
  const categoryConf = CATEGORY_CONFIG[issue.category];
  const severityConf = SEVERITY_CONFIG[issue.severity];
  const statusConf = STATUS_CONFIG[issue.status];

  return (
    <div className="issue-card" onClick={onClick}>
      {/* Media thumbnail */}
      {!compact && issue.media && issue.media.length > 0 && (
        <div
          style={{
            height: "120px",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            marginBottom: "12px",
            position: "relative",
          }}
        >
          <img
            src={issue.media[0].url}
            alt={issue.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {issue.media.length > 1 && (
            <span
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                fontSize: "0.7rem",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              +{issue.media.length - 1} more
            </span>
          )}
        </div>
      )}

      <div className="issue-card-header">
        <div style={{ flex: 1 }}>
          <div
            className="issue-card-title"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {issue.title}
          </div>
        </div>
        {/* Severity */}
        <div className="severity-dots">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`severity-dot ${n <= issue.severity ? "filled" : ""}`}
              style={{
                color: severityConf.color,
              }}
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="issue-card-meta">
        <span
          className="badge"
          style={{
            background: categoryConf.bgColor,
            color: categoryConf.color,
          }}
        >
          {categoryConf.icon} {categoryConf.label}
        </span>
        <span
          className="badge"
          style={{
            background: statusConf.bgColor,
            color: statusConf.color,
          }}
        >
          {statusConf.label}
        </span>
        {issue.aiAnalysis && (
          <span className="ai-badge">✨ AI</span>
        )}
      </div>

      {/* Location & Meta */}
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="issue-card-location">
          <MapPin size={11} />
          <span
            style={{
              maxWidth: "150px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {issue.location.ward || issue.location.address}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <ThumbsUp size={11} /> {issue.upvotes || 0}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <CheckCircle size={11} /> {(issue.verifiedBy || []).length}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Clock size={11} /> {formatDistanceToNow(issue.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
