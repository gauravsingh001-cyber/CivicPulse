"use client";

import { useEffect, useState } from "react";
import { subscribeToLeaderboard } from "@/lib/firestore";
import { UserProfile } from "@/types";
import { LEVEL_COLORS, LEVEL_ICONS } from "@/lib/gamification";
import { Trophy, Award, Flame, CheckCircle, Navigation, Shield, User } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";

export default function LeaderboardPage() {
  const { user } = useAuthContext();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard((data) => {
      setLeaders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const currentUserProfile = leaders.find((l) => l.uid === user?.uid);
  const currentUserRank = leaders.findIndex((l) => l.uid === user?.uid) + 1;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div className="loading-spinner" />
      </div>
    );
  }

  // Top 3 Podium
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px 24px",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div className="hero-badge" style={{ display: "inline-flex", marginBottom: "12px" }}>
          <Trophy size={14} /> Live Leaderboard
        </div>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
          Community <span className="gradient-text">Champions</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
          Earn points by reporting, verifying, and helping resolve community issues. High levels unlock special badges!
        </p>
      </div>

      {/* Logged in User stats banner */}
      {user && currentUserProfile && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            marginBottom: "40px",
            border: "1px solid var(--border-strong)",
            background: "rgba(79, 142, 247, 0.05)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              className="avatar-placeholder"
              style={{
                width: "56px",
                height: "56px",
                fontSize: "1.5rem",
                borderRadius: "50%",
              }}
            >
              {currentUserProfile.photoURL ? (
                <img
                  src={currentUserProfile.photoURL}
                  alt={currentUserProfile.displayName}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                (currentUserProfile.displayName || "U")[0].toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {currentUserProfile.displayName} (You)
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: LEVEL_COLORS[currentUserProfile.level],
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {LEVEL_ICONS[currentUserProfile.level]} {currentUserProfile.level}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Rank</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-primary)" }}>
                #{currentUserRank || "-"}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Points</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-accent)" }}>
                {currentUserProfile.points}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table List */}
      <div className="glass-card" style={{ padding: "0" }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: "1.1rem" }}>Leaderboard rankings</h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Total {leaders.length} active citizens
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Rank</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>User</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Level</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "center" }}>Reports</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "center" }}>In Progress</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "center" }}>Resolved</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Badges</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Total Points</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, index) => {
                const rank = index + 1;
                const isCurrentUser = leader.uid === user?.uid;
                return (
                  <tr
                    key={leader.uid}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isCurrentUser ? "rgba(79, 142, 247, 0.04)" : "transparent",
                      transition: "background 0.2s",
                    }}
                    className="leaderboard-row"
                  >
                    {/* Rank */}
                    <td style={{ padding: "16px 24px", fontWeight: 700 }}>
                      <span
                        className={`leaderboard-rank ${rank <= 3 ? "top-3" : ""}`}
                        style={{
                          color:
                            rank === 1
                              ? "var(--brand-warning)"
                              : rank === 2
                              ? "#94a3b8"
                              : rank === 3
                              ? "#b45309"
                              : "var(--text-muted)",
                        }}
                      >
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                      </span>
                    </td>

                    {/* User Profile */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          className="avatar-placeholder"
                          style={{ width: "32px", height: "32px", fontSize: "0.8rem", borderRadius: "50%" }}
                        >
                          {leader.photoURL ? (
                            <img src={leader.photoURL} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            leader.displayName[0].toUpperCase()
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {leader.displayName} {isCurrentUser && <span style={{ fontSize: "0.75rem", color: "var(--brand-primary)" }}>(You)</span>}
                        </span>
                      </div>
                    </td>

                    {/* Level */}
                    <td style={{ padding: "16px 24px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: LEVEL_COLORS[leader.level],
                        }}
                      >
                        {LEVEL_ICONS[leader.level]} {leader.level}
                      </span>
                    </td>

                    {/* Reports count */}
                    <td style={{ padding: "16px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
                      {leader.reportedCount ?? leader.issuesReported ?? 0}
                    </td>

                    {/* In Progress count */}
                    <td style={{ padding: "16px 24px", textAlign: "center", color: "#f59e0b", fontWeight: (leader.inProgressCount || 0) > 0 ? 600 : 400 }}>
                      {leader.inProgressCount || 0}
                    </td>

                    {/* Resolved count */}
                    <td style={{ padding: "16px 24px", textAlign: "center", color: "var(--brand-success)", fontWeight: (leader.resolvedCount || 0) > 0 ? 600 : 400 }}>
                      {leader.resolvedCount || 0}
                    </td>

                    {/* Badges */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {(leader.badges || []).length === 0 ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None</span>
                        ) : (
                          leader.badges.map((b) => (
                            <span key={b.id} title={b.name} style={{ cursor: "help", fontSize: "1.1rem" }}>
                              {b.icon}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Total Points */}
                    <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                      {leader.points} pts
                    </td>
                  </tr>
                );
              })}

              {leaders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                    No citizens on the leaderboard yet. Be the first to earn points!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
