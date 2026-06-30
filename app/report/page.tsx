"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { createIssue, uploadMedia, awardPoints } from "@/lib/firestore";
import { CATEGORY_CONFIG, SEVERITY_CONFIG, DEPARTMENT_BY_CATEGORY } from "@/lib/gamification";
import { generateIssueTitle, fileToBase64 } from "@/lib/utils";
import { IssueCategory, IssueSeverity, MediaItem } from "@/types";
import type { AIAnalysis } from "@/types";
import {
  MapPin,
  CheckCircle,
  Upload,
  Sparkles,
  Navigation,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STEPS = ["Location", "Media & AI", "Details", "Review"];

export default function ReportPage() {
  const router = useRouter();
  const { user, refreshProfile, loading: authLoading } = useAuthContext();
  const { location, loading: gpsLoading, getCurrentLocation, requestLocationOnLoad, setLocation } = useGeolocation();

  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    requestLocationOnLoad();
  }, [requestLocationOnLoad]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as IssueCategory | "",
    severity: 3 as IssueSeverity,
    aiAnalysis: null as AIAnalysis | null,
  });

  // File drop handler
  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));

    // Generate previews
    for (const file of validFiles) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) =>
          setPreviews((prev) => [...prev, e.target?.result as string]);
        reader.readAsDataURL(file);
      } else {
        setPreviews((prev) => [...prev, "/video-thumb.png"]);
      }
    }
  }, []);

  const savePendingIssue = useCallback((payload: Record<string, unknown>) => {
    if (typeof window === "undefined") return;

    const existing = JSON.parse(localStorage.getItem("pendingIssues") || "[]");
    const id = payload.id || "local_" + Math.random().toString(36).substring(2, 11);
    const next = [
      {
        ...payload,
        id,
        createdAt: payload.createdAt || Date.now(),
        pending: true,
      },
      ...existing,
    ].slice(0, 20);

    localStorage.setItem("pendingIssues", JSON.stringify(next));
  }, []);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div className="loading-spinner" style={{ width: "40px", height: "40px" }} />
        <h2>Checking login status...</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Please wait while we confirm your session.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <AlertTriangle size={48} style={{ color: "var(--brand-warning)" }} />
        <h2>Login Required</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Please login to report a community issue.
        </p>
        <button onClick={() => router.push("/login")} className="btn btn-primary">
          Login to Continue
        </button>
      </div>
    );
  }

  const analyzeWithAI = async () => {
    if (files.length === 0 && !form.description) return;

    setAiAnalyzing(true);
    toast.loading("Gemini AI is analyzing your issue...", { id: "ai-analyze" });

    try {
      let analysis: AIAnalysis | Partial<AIAnalysis> | null = null;

      const { analyzeIssueImage, categorizeByText } = await import("@/lib/gemini");

      if (files.length > 0 && files[0].type.startsWith("image/")) {
        const base64 = await fileToBase64(files[0]);
        analysis = await analyzeIssueImage(base64, files[0].type, form.description);
      } else if (form.description) {
        analysis = await categorizeByText(form.description);
      }

      if (analysis) {
        const fullAnalysis = "description" in analysis && "confidence" in analysis
          ? (analysis as AIAnalysis)
          : null;

        setForm((prev) => ({
          ...prev,
          category: analysis.category || prev.category,
          severity: (analysis.severity as IssueSeverity) || prev.severity,
          description: fullAnalysis?.description || prev.description,
          title:
            prev.title ||
            generateIssueTitle(
              analysis.category || "other",
              location?.address || ""
            ),
          aiAnalysis: fullAnalysis || prev.aiAnalysis,
        }));
        toast.success("AI analysis complete! ✨", { id: "ai-analyze" });
      }
    } catch {
      toast.error("AI analysis failed. Please fill details manually.", { id: "ai-analyze" });
    } finally {
      setAiAnalyzing(false);
    }
  };


  const handleSubmit = async () => {
    if (!location || !form.category || !form.title) {
      toast.error("Please fill all required fields!");
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one photo or video before submitting.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting your report...");

    try {
      const mediaItems: MediaItem[] = [];
      let mediaUploadFailed = false;

      for (const file of files) {
        try {
          const uploaded = await uploadMedia(file, user.uid);
          mediaItems.push(uploaded);
        } catch (error) {
          mediaUploadFailed = true;
          console.warn("Media upload skipped:", error);
        }
      }

      const issuePayload = {
        title: form.title,
        description: form.description,
        category: form.category as IssueCategory,
        severity: form.severity,
        status: "reported" as const,
        location,
        media: mediaItems,
        reportedBy: user.uid,
        reportedByName: user.displayName || user.email || "Anonymous",
        reportedByAvatar: user.photoURL || undefined,
        verifiedBy: [],
        upvotes: 0,
        upvotedBy: [],
        department:
          DEPARTMENT_BY_CATEGORY[form.category as IssueCategory] ||
          "General Administration",
        comments: [],
        statusHistory: [
          {
            status: "reported" as const,
            updatedBy: user.uid,
            updatedByName: user.displayName || "Anonymous",
            timestamp: Date.now(),
          },
        ],
        aiAnalysis: form.aiAnalysis || undefined,
      };

      const localId = "local_" + Math.random().toString(36).substring(2, 11);
      const issuePayloadWithId = {
        id: localId,
        ...issuePayload,
      };

      let issueId = "";
      try {
        issueId = await createIssue(issuePayload);
      } catch (error) {
        console.warn("Firestore issue creation failed, saving locally:", error);
        savePendingIssue(issuePayloadWithId);
        toast.success("Your report was saved locally. You can view it now!", {
          id: toastId,
        });
        router.push(`/issues/${localId}`);
        return;
      }

      await awardPoints(user.uid, "report_issue");
      await refreshProfile();

      // Cache it locally so it remains visible immediately even if Firestore GET fails
      savePendingIssue({
        id: issueId,
        ...issuePayload,
        pending: false,
      });

      if (mediaUploadFailed) {
        toast.success("Issue reported successfully. Some media could not be uploaded, but the report was saved.", {
          id: toastId,
        });
      } else {
        toast.success("Issue reported successfully! +10 points 🎉", {
          id: toastId,
        });
      }
      router.push(`/issues/${issueId}`);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to submit report. Please try again.";
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = [
    !!location, // Step 0: location required
    files.length > 0, // Step 1: media required
    !!(form.category && form.title), // Step 2: category & title required
    true, // Step 3: review
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "40px 24px",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div className="hero-badge" style={{ display: "inline-flex", marginBottom: "12px" }}>
          <MapPin size={14} /> Report Community Issue
        </div>
        <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>
          Report an Issue
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Our AI will automatically analyze and categorize your report
        </p>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator" style={{ marginBottom: "40px" }}>
        {STEPS.map((label, i) => (
          <div key={i} className="step" style={{ flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div
                className={`step-circle ${i === step ? "active" : i < step ? "completed" : ""}`}
              >
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`step-line ${i < step ? "completed" : ""}`}
                />
              )}
            </div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ==================== STEP 0: LOCATION ==================== */}
      {step === 0 && (
        <div className="glass-card" style={{ padding: "32px" }}>
          <h3 style={{ marginBottom: "8px" }}>📍 Select Issue Location</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.875rem" }}>
            Use GPS detection or click on the map to select the exact location
          </p>

          <button
            onClick={getCurrentLocation}
            className="btn btn-primary"
            disabled={gpsLoading}
            style={{ marginBottom: "20px" }}
          >
            {gpsLoading ? (
              <div className="loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
            ) : (
              <Navigation size={16} />
            )}
            {gpsLoading ? "Detecting location..." : "Use My GPS Location"}
          </button>

          {location && (
            <div
              style={{
                background: "rgba(6,214,160,0.1)",
                border: "1px solid rgba(6,214,160,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <CheckCircle size={18} style={{ color: "var(--brand-accent)", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--brand-accent)", marginBottom: "4px" }}>
                  Location Detected!
                </div>
                <input
                  type="text"
                  value={location.address}
                  onChange={(e) => setLocation({ ...location, address: e.target.value })}
                  title="Edit Address"
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-normal)", borderRadius: "4px", padding: "6px 8px", width: "100%", outline: "none", marginBottom: "6px" }}
                />
                <input
                  type="text"
                  value={location.ward || ""}
                  onChange={(e) => setLocation({ ...location, ward: e.target.value })}
                  placeholder="Enter Ward/Area"
                  title="Edit Ward"
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-normal)", borderRadius: "4px", padding: "6px 8px", width: "100%", outline: "none" }}
                />
              </div>
            </div>
          )}

          <div className="map-container" style={{ height: "300px" }}>
            <MapView
              issues={[]}
              center={location ? [location.lat, location.lng] : [20.5937, 78.9629]}
              zoom={location ? 15 : 5}
            />
          </div>
        </div>
      )}

      {/* ==================== STEP 1: MEDIA ==================== */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: "32px" }}>
          <h3 style={{ marginBottom: "8px" }}>📸 Add Photo/Video</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.875rem" }}>
            Upload images or video of the issue. Gemini AI will auto-analyze them.
          </p>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragging ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
            />
            <Upload size={32} style={{ color: "var(--brand-primary)", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Drop files here or click to upload
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Supports images and videos (up to 5 files). At least one photo or video is required to continue.
            </div>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
              {previews.map((prev, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img
                    src={prev}
                    alt={`Preview ${i + 1}`}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "var(--radius-md)",
                      border: "2px solid var(--border-normal)",
                    }}
                  />
                  <button
                    onClick={() => {
                      setFiles((f) => f.filter((_, idx) => idx !== i));
                      setPreviews((p) => p.filter((_, idx) => idx !== i));
                    }}
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "20px",
                      height: "20px",
                      background: "var(--brand-danger)",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* AI Analyze Button */}
          {(files.length > 0 || form.description) && (
            <button
              onClick={analyzeWithAI}
              className="btn btn-secondary"
              disabled={aiAnalyzing}
              style={{ marginTop: "20px", width: "100%" }}
            >
              {aiAnalyzing ? (
                <div className="loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
              ) : (
                <Sparkles size={16} />
              )}
              {aiAnalyzing ? "Analyzing with Gemini AI..." : "✨ Auto-Analyze with Gemini AI"}
            </button>
          )}

          {/* AI Result Preview */}
          {form.aiAnalysis && (
            <div
              style={{
                marginTop: "16px",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
              }}
            >
              <div className="ai-badge" style={{ marginBottom: "10px" }}>
                ✨ Gemini Analysis Complete
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span>
                  Category:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {CATEGORY_CONFIG[form.aiAnalysis.category as IssueCategory]?.label}
                  </strong>
                </span>
                <span>
                  Severity:{" "}
                  <strong style={{ color: SEVERITY_CONFIG[form.aiAnalysis.severity as IssueSeverity]?.color }}>
                    {SEVERITY_CONFIG[form.aiAnalysis.severity as IssueSeverity]?.label}
                  </strong>
                </span>
                <span>
                  Confidence:{" "}
                  <strong style={{ color: "var(--brand-accent)" }}>
                    {Math.round(form.aiAnalysis.confidence * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== STEP 2: DETAILS ==================== */}
      {step === 2 && (
        <div className="glass-card" style={{ padding: "32px" }}>
          <h3 style={{ marginBottom: "8px" }}>📋 Issue Details</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.875rem" }}>
            Confirm or edit the AI-suggested details
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Category */}
            <div className="input-group">
              <label className="input-label">Category *</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as IssueCategory }))
                }
              >
                <option value="">Select Category</option>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="input-group">
              <label className="input-label">Issue Title *</label>
              <input
                className="input"
                placeholder="Brief title for the issue"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input"
                placeholder="Describe the issue in detail..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Severity */}
            <div className="input-group">
              <label className="input-label">
                Severity: {SEVERITY_CONFIG[form.severity]?.label}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={form.severity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, severity: parseInt(e.target.value) as IssueSeverity }))
                }
                style={{ width: "100%", accentColor: SEVERITY_CONFIG[form.severity]?.color }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                <span>Very Low</span>
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
                <span>Critical</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: REVIEW ==================== */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: "32px" }}>
          <h3 style={{ marginBottom: "24px" }}>✅ Review & Submit</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Location */}
            <div
              style={{
                padding: "16px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📍 Location
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                {location?.address}
              </div>
              {location?.ward && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Ward: {location.ward}
                </div>
              )}
            </div>

            {/* Category & Severity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Category
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                  {form.category && CATEGORY_CONFIG[form.category]?.icon}{" "}
                  {form.category && CATEGORY_CONFIG[form.category]?.label}
                </div>
              </div>
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Severity
                </div>
                <div style={{ fontSize: "0.875rem", color: SEVERITY_CONFIG[form.severity]?.color, fontWeight: 600 }}>
                  {SEVERITY_CONFIG[form.severity]?.label}
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Title
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                {form.title}
              </div>
            </div>

            {/* Media */}
            {previews.length > 0 && (
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Media ({files.length} file{files.length > 1 ? "s" : ""})
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {previews.map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Points Reward */}
            <div
              style={{
                background: "rgba(6,214,160,0.1)",
                border: "1px solid rgba(6,214,160,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>🎯</span>
              <div>
                <div style={{ fontWeight: 600, color: "var(--brand-accent)", fontSize: "0.875rem" }}>
                  +10 Points Reward
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  You&apos;ll earn 10 CivicPulse points for reporting this issue
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NAVIGATION ==================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "24px",
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {step < 3 ? (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (step === 1 && files.length === 0) {
                toast.error("Please upload at least one photo or video to continue.");
                return;
              }
              setStep((s) => s + 1);
            }}
            disabled={!canNext[step]}
          >
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <div className="loading-spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} />
            ) : (
              <CheckCircle size={18} />
            )}
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        )}
      </div>
    </div>
  );
}
