"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import {
  getIssueById,
  verifyIssue,
  upvoteIssue,
  addComment,
  updateIssueStatus,
  awardPoints,
  assignDepartment,
  uploadMedia,
  deleteIssue,
} from "@/lib/firestore";
import {
  CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from "@/lib/gamification";
import { formatDateTime, formatDistanceToNow, fileToBase64, compressImage, getGovEmailByLocation, getGovTwitterHandleByLocation } from "@/lib/utils";
import { Issue, IssueStatus, Department } from "@/types";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  ThumbsUp,
  MessageSquare,
  Send,
  Share2,
  AlertCircle,
  Clock,
  User,
  Shield,
  Upload,
  Trash2,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_STEPS: IssueStatus[] = [
  "reported",
  "in_progress",
  "resolved",
];

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile, refreshProfile } = useAuthContext();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [upvoting, setUpvoting] = useState(false);
  
  // Reporter Status Update States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [reporterStatus, setReporterStatus] = useState<IssueStatus>("in_progress");
  const [reporterNote, setReporterNote] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);



  const issueId = params?.id as string;

  useEffect(() => {
    if (!issueId || issueId === "undefined") {
      setIssue(null);
      setLoading(false);
      return;
    }

    const loadIssue = async () => {
      const data = await getIssueById(issueId);
      setIssue(data);
      setLoading(false);
    };

    loadIssue();
  }, [issueId]);

  const handleVerify = async () => {
    if (!user || !issue) return;
    if (issue.verifiedBy?.includes(user.uid)) {
      toast.error("You've already verified this issue!");
      return;
    }
    if (issue.reportedBy === user.uid) {
      toast.error("You cannot verify your own issue!");
      return;
    }

    await verifyIssue(issueId, user.uid);
    await awardPoints(user.uid, "verify_issue");
    await refreshProfile();
    toast.success("Issue verified! +5 points 🎉");
    setIssue((prev) =>
      prev
        ? { ...prev, verifiedBy: [...(prev.verifiedBy || []), user.uid] }
        : null
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReporterStatusUpdate = async () => {
    if (!user || !issue || !selectedFile || submittingStatus) {
      toast.error("Please upload a mandatory proof image.");
      return;
    }
    setSubmittingStatus(true);
    const toastId = toast.loading("Uploading proof image and updating status...");

    try {
      // 1. Instantly compress the image to a lightweight Base64 string so it always succeeds in Firestore (no Storage needed)
      let imageUrl = "";
      try {
        imageUrl = await compressImage(selectedFile, 800);
      } catch (err) {
        console.warn("Compression failed, using local preview:", err);
        imageUrl = filePreview || "";
      }

      const isReporter = issue.reportedBy === user.uid;
      const roleText = isReporter ? "reporter" : "official";
      const noteText = reporterNote.trim() || `Status updated to ${reporterStatus} by ${roleText}`;
      const updaterName = user.displayName || user.email || (isReporter ? "Reporter" : "Official");

      // 2. Call updateIssueStatus
      await updateIssueStatus(
        issueId,
        reporterStatus,
        user.uid,
        updaterName,
        noteText,
        imageUrl
      );

      // 3. Award points if resolved or in progress
      if (reporterStatus === "resolved" || reporterStatus === "in_progress") {
        const pointsRecipient = isReporter ? user.uid : (issue.reportedBy || user.uid);
        const eventType = reporterStatus === "resolved" ? "issue_resolved" : "issue_in_progress";
        await awardPoints(pointsRecipient, eventType);
        await refreshProfile();
      }

      toast.success(`Status updated to ${reporterStatus}!`, { id: toastId });

      // 4. Update local state
      setIssue((prev) => {
        if (!prev) return null;
        const newHistoryEntry = {
          status: reporterStatus,
          updatedBy: user.uid,
          updatedByName: updaterName,
          timestamp: Date.now(),
          note: noteText,
          imageUrl,
        };

        return {
          ...prev,
          status: reporterStatus,
          updatedAt: Date.now(),
          statusHistory: [...(prev.statusHistory || []), newHistoryEntry],
        };
      });

      // Clear states
      setSelectedFile(null);
      setFilePreview(null);
      setReporterNote("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status. Please try again.", { id: toastId });
    } finally {
      setSubmittingStatus(false);
    }
  };



  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this issue?")) return;
    try {
      await deleteIssue(issueId);
      toast.success("Issue deleted successfully!");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete issue.");
    }
  };

  const handleUpvote = async () => {
    if (!user || !issue || upvoting) return;
    setUpvoting(true);

    const hasUpvoted = issue.upvotedBy?.includes(user.uid);

    // Optimistic Update
    setIssue((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        upvotes: hasUpvoted
          ? Math.max(0, (prev.upvotes || 0) - 1)
          : (prev.upvotes || 0) + 1,
        upvotedBy: hasUpvoted
          ? (prev.upvotedBy || []).filter((id) => id !== user.uid)
          : [...(prev.upvotedBy || []), user.uid],
      };
    });

    try {
      await upvoteIssue(issueId, user.uid);
    } catch (error) {
      console.error("Upvote failed:", error);
      // Revert if error
      setIssue((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          upvotes: hasUpvoted
            ? (prev.upvotes || 0) + 1
            : Math.max(0, (prev.upvotes || 0) - 1),
          upvotedBy: hasUpvoted
            ? [...(prev.upvotedBy || []), user.uid]
            : (prev.upvotedBy || []).filter((id) => id !== user.uid),
        };
      });
      toast.error("Failed to update upvote. Please try again.");
    } finally {
      setUpvoting(false);
    }
  };

  const handleComment = async () => {
    if (!user || !comment.trim() || !issue) return;
    setSubmittingComment(true);

    await addComment(issueId, {
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      userAvatar: user.photoURL || undefined,
      text: comment,
      createdAt: Date.now(),
      isOfficial: false,
    });
    await awardPoints(user.uid, "comment");

    setIssue((prev) =>
      prev
        ? {
            ...prev,
            comments: [
              ...(prev.comments || []),
              {
                id: Date.now().toString(),
                userId: user.uid,
                userName: user.displayName || "Anonymous",
                text: comment,
                createdAt: Date.now(),
                isOfficial: false,
              },
            ],
          }
        : null
    );

    setComment("");
    setSubmittingComment(false);
    toast.success("Comment added!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleEmailGovernment = () => {
    if (!issue) return;
    
    // Get the email based on the location mapping
    const govEmail = getGovEmailByLocation(issue.location.address, issue.location.ward);
    
    const mediaLinks = issue.media && issue.media.length > 0 
      ? issue.media.map((m, i) => `Image ${i+1}: ${m.url}`).join('\n') 
      : "⚠️ NO IMAGES ATTACHED ⚠️\n[IMPORTANT: Please attach the issue images or proofs manually before sending!]";

    // Construct the email content
    const subject = `CivicPulse Report: ${issue.title} (Issue #${issueId.substring(0, 8)})`;
    const body = `Dear Sir/Madam,

I am reporting a community issue in your jurisdiction using the CivicPulse platform.

Issue Details:
- Title: ${issue.title}
- Category: ${issue.category}
- Location: ${issue.location.address} ${issue.location.ward ? `(${issue.location.ward})` : ''}

Description:
${issue.description}

Attached Proofs (Images):
${mediaLinks}

Please view the full issue timeline here:
${window.location.href}

Thank you,
${user?.displayName || "A concerned citizen"}`;

    // Create the Gmail compose link instead of generic mailto
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${govEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Gmail in a new tab
    window.open(gmailLink, '_blank');
    
    toast.success("Opening Gmail...");
  };

  const handleShareOnX = () => {
    if (!issue) return;

    const govHandle = getGovTwitterHandleByLocation(issue.location.address, issue.location.ward);
    
    const mediaLink = issue.media && issue.media.length > 0 ? `\nProof Image: ${issue.media[0].url}` : '\n⚠️ Please attach proof image manually!';

    const tweetText = `🚨 Civic Issue Reported: ${issue.title}\n📍 ${issue.location.ward || issue.location.address}\n\n${issue.description.substring(0, 80)}...${mediaLink}\n\nPls look into this ${govHandle} #CivicPulse`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(window.location.href)}`;
    
    window.open(twitterUrl, '_blank');
    toast.success("Opening X (Twitter)...");
  };

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

  if (!issue) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <AlertCircle size={48} style={{ color: "var(--brand-warning)", margin: "0 auto 16px" }} />
        <h2>Issue Not Found</h2>
        <button onClick={() => router.push("/dashboard")} className="btn btn-primary" style={{ marginTop: "20px" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const catConf = CATEGORY_CONFIG[issue.category];
  const sevConf = SEVERITY_CONFIG[issue.severity];
  const statConf = STATUS_CONFIG[issue.status];
  const currentStep = STATUS_STEPS.indexOf(issue.status);
  const isVerified = user && issue.verifiedBy?.includes(user.uid);
  const isUpvoted = user && issue.upvotedBy?.includes(user.uid);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="btn btn-ghost"
        style={{ marginBottom: "20px" }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* ==================== MAIN CONTENT ==================== */}
        <div>
          {/* Header */}
          <div className="glass-card" style={{ padding: "28px", marginBottom: "20px" }}>
            {/* Tags */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <span
                className="badge"
                style={{ background: catConf.bgColor, color: catConf.color, fontSize: "0.8rem" }}
              >
                {catConf.icon} {catConf.label}
              </span>
              <span
                className="badge"
                style={{ background: statConf.bgColor, color: statConf.color, fontSize: "0.8rem" }}
              >
                {statConf.label}
              </span>
              <span
                className="badge"
                style={{ background: sevConf.bgColor, color: sevConf.color, fontSize: "0.8rem" }}
              >
                {sevConf.label} Severity
              </span>
              {issue.aiAnalysis && <span className="ai-badge">✨ AI Analyzed</span>}
            </div>

            <h1
              style={{
                fontSize: "1.75rem",
                marginBottom: "12px",
                lineHeight: 1.3,
              }}
            >
              {issue.title}
            </h1>

            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "16px" }}>
              {issue.description}
            </p>

            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                paddingTop: "16px",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <User size={13} /> {issue.reportedByName}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <MapPin size={13} /> {issue.location.ward || "Unknown Ward"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Clock size={13} /> {formatDistanceToNow(issue.createdAt)}
              </span>
              <span>🏛️ {issue.department}</span>
            </div>
          </div>

          {/* Media */}
          {issue.media && issue.media.length > 0 && (
            <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontWeight: 600, marginBottom: "12px", fontSize: "0.875rem" }}>
                📷 Issue Media
              </div>
              <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "10px" }}>
                {issue.media[activeImg].type === "video" ? (
                  <video
                    src={issue.media[activeImg].url}
                    controls
                    style={{ width: "100%", maxHeight: "300px", objectFit: "contain", background: "#000" }}
                  />
                ) : (
                  <img
                    src={issue.media[activeImg].url}
                    alt="Issue"
                    style={{ width: "100%", maxHeight: "300px", objectFit: "cover" }}
                  />
                )}
              </div>
              {issue.media.length > 1 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {issue.media.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        border: i === activeImg ? "2px solid var(--brand-primary)" : "2px solid transparent",
                        flexShrink: 0,
                      }}
                    >
                      <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {/* Upvote */}
              <button
                className="btn btn-secondary"
                onClick={handleUpvote}
                disabled={!user || upvoting}
                style={{
                  color: isUpvoted ? "var(--brand-primary)" : undefined,
                  borderColor: isUpvoted ? "var(--brand-primary)" : undefined,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <ThumbsUp size={16} />
                {issue.upvotes || 0} Upvotes
              </button>

              {/* Share */}
              <button className="btn btn-ghost" onClick={handleShare} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Share2 size={16} />
                Share
              </button>
              
              {/* Email Government */}
              <button 
                className="btn btn-primary" 
                onClick={handleEmailGovernment} 
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "8px",
                  background: "linear-gradient(135deg, #ea4335, #d93025)",
                  color: "white",
                  border: "none",
                  fontWeight: 600
                }}
              >
                <Mail size={16} />
                Email Govt
              </button>

              {/* Share on X */}
              <button 
                className="btn btn-primary" 
                onClick={handleShareOnX} 
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "8px",
                  background: "#000000",
                  color: "white",
                  border: "none",
                  fontWeight: 600
                }}
              >
                <Share2 size={16} />
                Post on X
              </button>

              {/* Delete Issue */}
              {user && issue.reportedBy === user.uid && (
                <button
                  className="btn btn-secondary"
                  onClick={handleDelete}
                  style={{
                    color: "var(--brand-danger)",
                    borderColor: "var(--brand-danger)",
                    background: "rgba(239, 68, 68, 0.05)",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  title="Delete this issue"
                >
                  <Trash2 size={16} />
                  Delete Issue
                </button>
              )}
            </div>

            {!user && (
              <p style={{ marginTop: "10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <a href="/login" style={{ color: "var(--brand-primary)" }}>Login</a> to upvote this issue
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <MessageSquare size={18} />
              Comments ({(issue.comments || []).length})
            </h3>

            {/* Add comment */}
            {user ? (
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <div className="avatar-placeholder" style={{ flexShrink: 0 }}>
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, display: "flex", gap: "8px" }}>
                  <input
                    className="input"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  />
                  <button
                    className="btn btn-primary btn-icon"
                    onClick={handleComment}
                    disabled={!comment.trim() || submittingComment}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ marginBottom: "20px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                <a href="/login" style={{ color: "var(--brand-primary)" }}>Login</a> to add a comment
              </p>
            )}

            {/* Comments list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {(issue.comments || []).length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  No comments yet. Be the first!
                </p>
              ) : (
                [...(issue.comments || [])].reverse().map((c) => (
                  <div
                    key={c.id}
                    style={{ display: "flex", gap: "10px" }}
                  >
                    <div
                      className="avatar-placeholder"
                      style={{ flexShrink: 0, fontSize: "0.75rem", width: "30px", height: "30px" }}
                    >
                      {c.userName[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {c.userName}
                        </span>
                        {c.isOfficial && (
                          <span className="badge" style={{ background: "rgba(79,142,247,0.15)", color: "var(--brand-primary)", fontSize: "0.65rem" }}>
                            Official
                          </span>
                        )}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {formatDistanceToNow(c.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ==================== SIDEBAR ==================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Timeline */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "20px" }}>
              📊 Status Timeline
            </h3>
            <div className="timeline">
              {STATUS_STEPS.map((s, i) => {
                const conf = STATUS_CONFIG[s];
                const isDone = i <= currentStep;
                const isActive = i === currentStep;
                const histEntry = issue.statusHistory?.find((h) => h.status === s);

                return (
                  <div key={s} className="timeline-item">
                    <div
                      className={`timeline-dot ${isActive ? "active" : isDone ? "completed" : ""}`}
                      style={{ borderColor: isDone ? conf.color : "var(--border-normal)" }}
                    />
                    <div className="timeline-content">
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: isDone ? conf.color : "var(--text-muted)",
                        }}
                      >
                        {conf.label}
                      </div>
                      {histEntry && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          <div>{formatDateTime(histEntry.timestamp)}</div>
                          {histEntry.note && (
                            <div style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                              {histEntry.note}
                            </div>
                          )}
                          {histEntry.imageUrl && (
                            <div style={{ marginTop: "8px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)", maxWidth: "150px" }}>
                              <img
                                src={histEntry.imageUrl}
                                alt="Status Update Proof"
                                style={{ width: "100%", maxHeight: "100px", objectFit: "cover", cursor: "pointer" }}
                                onClick={() => setActiveModalImage(histEntry.imageUrl || null)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Update Panel */}
          {user && (
            <div className="glass-card" style={{ padding: "24px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <CheckCircle size={18} style={{ color: "var(--brand-success)" }} />
                <h3 style={{ fontSize: "1rem", margin: 0 }}>🔧 Update Issue Status</h3>
              </div>

              {issue.status === "resolved" ? (
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "12px", textAlign: "center", color: "var(--brand-success)", fontSize: "0.85rem", fontWeight: 500 }}>
                  🎉 This issue is fully resolved!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    As a reporter or admin official, upload a status photo to update the progress.
                  </p>

                  {/* Target Status */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                      New Status
                    </label>
                    <select
                      value={reporterStatus}
                      onChange={(e) => setReporterStatus(e.target.value as IssueStatus)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border-normal)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    >
                      {issue.status === "reported" && (
                        <option value="in_progress" style={{ background: "#1e1b4b" }}>In Progress</option>
                      )}
                      <option value="resolved" style={{ background: "#1e1b4b" }}>Resolved</option>
                    </select>
                  </div>

                  {/* Upload Image (Mandatory) */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                      Proof Image (Mandatory)
                    </label>
                    
                    <div
                      style={{
                        border: "2px dashed var(--border-normal)",
                        borderRadius: "var(--radius-md)",
                        padding: "16px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.02)",
                        position: "relative",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: "pointer",
                        }}
                      />
                      {filePreview ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <img
                            src={filePreview}
                            alt="Preview"
                            style={{ maxWidth: "100%", maxHeight: "100px", borderRadius: "6px", objectFit: "cover" }}
                          />
                          <span style={{ fontSize: "0.7rem", color: "var(--brand-success)" }}>✓ Image ready</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                          <Upload size={20} />
                          <span style={{ fontSize: "0.75rem" }}>Click to upload image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                      Progress Note / Comment
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Workers are fixing / Cleaned up garbage"
                      value={reporterNote}
                      onChange={(e) => setReporterNote(e.target.value)}
                      style={{ fontSize: "0.85rem", padding: "8px 12px", width: "100%" }}
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    className="btn btn-primary"
                    onClick={handleReporterStatusUpdate}
                    disabled={!selectedFile || submittingStatus}
                    style={{
                      marginTop: "4px",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: !selectedFile ? "var(--bg-secondary)" : "linear-gradient(135deg, var(--brand-success), #059669)",
                      border: "none",
                      color: !selectedFile ? "var(--text-muted)" : "white",
                    }}
                  >
                    {submittingStatus ? "Updating..." : "Publish Status Update"}
                  </button>
                </div>
              )}
            </div>
          )}



          {/* AI Analysis */}
          {issue.aiAnalysis && (
            <div
              className="glass-card"
              style={{ padding: "20px", borderColor: "rgba(124,58,237,0.3)" }}
            >
              <div className="ai-badge" style={{ marginBottom: "12px" }}>
                ✨ AI Analysis
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Category</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    {catConf.icon} {catConf.label}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Severity</span>
                  <span style={{ color: sevConf.color, fontWeight: 600 }}>
                    {sevConf.label}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Confidence</span>
                  <span style={{ color: "var(--brand-accent)", fontWeight: 600 }}>
                    {Math.round((issue.aiAnalysis.confidence || 0.8) * 100)}%
                  </span>
                </div>
                {issue.aiAnalysis.tags && issue.aiAnalysis.tags.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>Tags</div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {issue.aiAnalysis.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="badge"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            color: "var(--text-secondary)",
                            fontSize: "0.7rem",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="glass-card" style={{ padding: "16px" }}>
            <h3 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>📍 Location</h3>
            <div style={{ height: "180px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <MapView
                issues={[issue]}
                center={[issue.location.lat, issue.location.lng]}
                zoom={15}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px" }}>
              {issue.location.address}
            </p>
          </div>
        </div>
      </div>
      
      {/* Zoom Modal overlay */}
      {activeModalImage && (
        <div
          onClick={() => setActiveModalImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setActiveModalImage(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                fontSize: "1.2rem",
                zIndex: 10,
              }}
            >
              ✕
            </button>
            <img
              src={activeModalImage}
              alt="Verification Proof"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
