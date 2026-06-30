"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getAllIssues, updateIssueStatus, assignDepartment, verifyIssue, deleteIssue, getLocalIssues } from "@/lib/firestore";
import { Issue, IssueStatus, Department } from "@/types";
import { CATEGORY_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from "@/lib/gamification";
import { Shield, RefreshCw, CheckCircle, ArrowRight, User, MapPin, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const DEPARTMENTS: Department[] = [
  "PWD",
  "Municipal Corporation",
  "Electricity Board",
  "Water Supply Board",
  "Sanitation Department",
  "Traffic Police",
  "General Administration",
];

const STATUSES: IssueStatus[] = ["reported", "in_progress", "resolved"];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIssues = async () => {
    // Optimistic fast load
    const local = getLocalIssues();
    if (local.length > 0) {
      setIssues(local);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const data = await getAllIssues();
      setIssues(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load admin issues data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    // Optimistic fast load
    const local = getLocalIssues();
    setIssues(local);
    setLoading(false);

    void (async () => {
      try {
        const data = await getAllIssues();
        setIssues(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load admin issues data.");
      }
    })();
  }, [authLoading, router, user]);

  const handleStatusChange = async (issueId: string, status: IssueStatus) => {
    setUpdatingId(issueId);
    try {
      await updateIssueStatus(
        issueId,
        status,
        user?.uid || "admin",
        user?.displayName || "Admin Official",
        `Status updated to ${status} via Admin Dashboard`
      );
      toast.success(`Status updated to ${status}!`);
      // Update local state
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? {
                ...i,
                status,
                updatedAt: Date.now(),
                statusHistory: [
                  ...(i.statusHistory || []),
                  {
                    status,
                    updatedBy: user?.uid || "admin",
                    updatedByName: user?.displayName || "Admin Official",
                    timestamp: Date.now(),
                    note: `Status updated to ${status} via Admin Dashboard`,
                  },
                ],
              }
            : i
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDepartmentChange = async (issueId: string, dept: Department) => {
    setUpdatingId(issueId);
    try {
      await assignDepartment(issueId, dept);
      toast.success(`Assigned to ${dept}!`);
      // Update local state
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, department: dept, status: "assigned" as IssueStatus, updatedAt: Date.now() } : i
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign department.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerify = async (issueId: string) => {
    setUpdatingId(issueId);
    try {
      await verifyIssue(issueId, user?.uid || "admin");
      toast.success("Issue verified by Admin!");
      // Update local state
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? {
                ...i,
                verifiedBy: [...(i.verifiedBy || []), user?.uid || "admin"],
                status: i.status === "reported" ? ("verified" as IssueStatus) : i.status,
              }
            : i
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to verify issue.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return;
    try {
      await deleteIssue(issueId);
      toast.success("Issue deleted successfully!");
      // Update local state
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete issue.");
    }
  };

  if (loading && issues.length === 0) {
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

  const filteredIssues =
    filterStatus === "all"
      ? issues
      : filterStatus === "reported"
      ? issues.filter((i) => i.reportedBy === user?.uid)
      : issues.filter((i) => i.status === filterStatus);

  // Stats calculation
  const total = issues.length;
  const reported = issues.filter((i) => i.status === "reported").length;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 24px",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div className="hero-badge" style={{ display: "inline-flex", marginBottom: "8px" }}>
            <Shield size={14} /> Official Dashboard
          </div>
          <h1 style={{ fontSize: "2.25rem", margin: 0 }}>
            Admin <span className="gradient-text">Console</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Resolve citizen complaints, assign municipal tasks, and manage departments
          </p>
        </div>

        <button onClick={fetchIssues} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Admin Profile Section */}
      {user && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            border: "1px solid rgba(79, 142, 247, 0.25)",
            background: "linear-gradient(135deg, rgba(79, 142, 247, 0.05), rgba(124, 58, 237, 0.05))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              className="avatar-placeholder"
              style={{
                width: "64px",
                height: "64px",
                fontSize: "1.5rem",
                borderRadius: "50%",
                boxShadow: "0 0 15px rgba(79, 142, 247, 0.3)",
                border: "2px solid var(--brand-primary)",
                flexShrink: 0,
              }}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Admin Avatar"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                user.displayName ? user.displayName[0].toUpperCase() : "A"
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700 }}>
                  {user.displayName || "Admin Official"}
                </h2>
                <span
                  className="badge"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-primary), #7c3aed)",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    padding: "2px 8px",
                  }}
                >
                  🛡️ Super Admin
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Admin Stats */}
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>My Reports</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-primary)" }}>
                {issues.filter((i) => i.reportedBy === user.uid).length}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>WIP Managed</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-warning)" }}>
                {issues.filter((i) => i.status === "in_progress" && i.statusHistory?.some((h) => h.updatedBy === user.uid)).length}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Resolutions</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-success)" }}>
                {issues.filter((i) => i.status === "resolved" && i.statusHistory?.some((h) => h.updatedBy === user.uid)).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>{total}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Reported</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#6b7280" }}>{reported}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>In Progress</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--brand-warning)" }}>{inProgress}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Resolved</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--brand-accent)" }}>{resolved}</div>
        </div>
      </div>

      {/* Controls & Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterStatus("all")}
            className={`btn btn-sm ${filterStatus === "all" ? "btn-primary" : "btn-secondary"}`}
          >
            All Issues
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`btn btn-sm ${filterStatus === status ? "btn-primary" : "btn-secondary"}`}
            >
              {STATUS_CONFIG[status]?.label || status}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Showing {filteredIssues.length} of {total} issues
        </span>
      </div>

      {/* Issues Table List */}
      <div className="glass-card" style={{ padding: "0" }}>
        {filteredIssues.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
            No issues match the selected status filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "16px 20px" }}>Issue Details</th>
                  <th style={{ padding: "16px 20px" }}>Reporter</th>
                  <th style={{ padding: "16px 20px" }}>Severity</th>
                  <th style={{ padding: "16px 20px" }}>Assign Department</th>
                  <th style={{ padding: "16px 20px" }}>Change Status</th>
                  <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue, idx) => {
                  const catConf = CATEGORY_CONFIG[issue.category];
                  const sevConf = SEVERITY_CONFIG[issue.severity];
                  const statConf = STATUS_CONFIG[issue.status];
                  const verifiedCount = (issue.verifiedBy || []).length;

                  return (
                    <tr
                      key={`${issue.id}-${idx}`}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        verticalAlign: "top",
                      }}
                    >
                      {/* Title & Category info */}
                      <td style={{ padding: "16px 20px", maxWidth: "300px" }}>
                        <div
                          onClick={() => router.push(`/issues/${issue.id}`)}
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            marginBottom: "6px",
                          }}
                          className="hover-underline"
                        >
                          {issue.title}
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span
                            className="badge"
                            style={{
                              background: catConf?.bgColor || "rgba(255,255,255,0.05)",
                              color: catConf?.color || "var(--text-secondary)",
                              fontSize: "0.7rem",
                            }}
                          >
                            {catConf?.icon} {catConf?.label}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: statConf?.bgColor || "rgba(255,255,255,0.05)",
                              color: statConf?.color || "var(--text-secondary)",
                              fontSize: "0.7rem",
                            }}
                          >
                            {statConf?.label}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <MapPin size={11} /> {issue.location.address}
                        </div>
                      </td>

                      {/* Reporter */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
                          <User size={13} style={{ color: "var(--brand-primary)" }} />
                          <span style={{ fontWeight: 500 }}>{issue.reportedByName}</span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          className="badge"
                          style={{
                            background: sevConf?.bgColor || "rgba(255,255,255,0.05)",
                            color: sevConf?.color || "var(--text-secondary)",
                            fontWeight: 700,
                          }}
                        >
                          {issue.severity} - {sevConf?.label}
                        </span>
                      </td>

                      {/* Assign Department */}
                      <td style={{ padding: "16px 20px" }}>
                        <select
                          className="input"
                          style={{ padding: "6px 28px 6px 12px", fontSize: "0.75rem", width: "160px" }}
                          value={issue.department || ""}
                          onChange={(e) => handleDepartmentChange(issue.id, e.target.value as Department)}
                          disabled={updatingId === issue.id}
                        >
                          <option value="">Unassigned</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Change Status */}
                      <td style={{ padding: "16px 20px" }}>
                        <div
                          onClick={() => router.push(`/issues/${issue.id}`)}
                          style={{
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(255,255,255,0.03)",
                            border: `1px solid ${statConf?.color || "var(--border-normal)"}`,
                            color: statConf?.color,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                          className="hover-glow"
                          title="Click to view details and update status with proof photo"
                        >
                          {statConf?.label || issue.status} ↗
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            onClick={() => router.push(`/issues/${issue.id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 10px" }}
                          >
                            View Details
                            <ArrowRight size={12} style={{ marginLeft: "4px" }} />
                          </button>
                          {issue.reportedBy === user?.uid && (
                            <button
                              onClick={() => handleDeleteIssue(issue.id)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: "4px 8px",
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                color: "var(--brand-danger)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(239, 68, 68, 0.05)",
                              }}
                              title="Delete this issue"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
