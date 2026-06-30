"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllIssues, getLocalIssues } from "@/lib/firestore";
import {
  MapPin,
  Shield,
  BarChart3,
  Zap,
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
} from "lucide-react";
import { Issue } from "@/types";

const FEATURES = [
  {
    icon: "📸",
    title: "AI-Powered Reporting",
    desc: "Upload photos or videos. Our Gemini AI instantly categorizes your issue and assigns it to the right department.",
    color: "#4f8ef7",
  },
  {
    icon: "🗺️",
    title: "Geo-Location Mapping",
    desc: "Interactive real-time map shows all community issues with color-coded pins, clusters, and heatmaps.",
    color: "#7c3aed",
  },
  {
    icon: "✅",
    title: "Community Verification",
    desc: "Citizens verify each other's reports. 3 verifications auto-confirm an issue for faster action.",
    color: "#06d6a0",
  },
  {
    icon: "📊",
    title: "Real-Time Tracking",
    desc: "Track issue status from Reported → Verified → Assigned → In Progress → Resolved, live.",
    color: "#f59e0b",
  },
  {
    icon: "🔮",
    title: "Predictive Insights",
    desc: "Gemini AI analyzes patterns to predict future problem hotspots before they become critical.",
    color: "#ef4444",
  },
  {
    icon: "🏛️",
    title: "Direct Govt Escalation",
    desc: "Seamlessly email comprehensive issue reports directly to relevant local government officials in one click.",
    color: "#3b82f6",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Spot & Report",
    desc: "Take a photo, drop a pin on the map, and submit. Gemini AI handles the rest.",
  },
  {
    step: "02",
    title: "Community Verifies",
    desc: "Neighbors confirm the issue. 3+ verifications automatically escalate it to authorities.",
  },
  {
    step: "03",
    title: "Escalate & Resolve",
    desc: "Email reports directly to your local government officials and track live resolution updates.",
  },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {typeof target === "number" && target % 1 !== 0
        ? count.toFixed(1)
        : count.toLocaleString()}
      {suffix}
    </span>
  );
}

function AnimatedWorker() {
  const jobs = [
    { text: "Fixing Pothole...", img: "/images/worker_pothole.png", animClass: "anim-jackhammer" },
    { text: "Clearing Garbage...", img: "/images/worker_garbage.png", animClass: "anim-pickup" },
    { text: "Repairing Light...", img: "/images/worker_streetlight.png", animClass: "anim-sway" }
  ];
  const [jobIndex, setJobIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setJobIndex((prev) => (prev + 1) % jobs.length);
    }, 6000); // Change character every 6 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-worker-feed">
      <div className="feed-badge">
        <span className="live-dot"></span>
        Live Maintenance
      </div>
      
      <div className="worker-portrait-container">
        {jobs.map((job, idx) => (
           <img 
             key={job.img}
             src={job.img} 
             alt="Worker" 
             className={`worker-portrait-img ${idx === jobIndex ? 'active ' + job.animClass : ''}`}
           />
        ))}
        <div className="portrait-overlay"></div>
      </div>

      <div className="worker-status">
        {jobs[jobIndex].text}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState([
    { label: "Issues Reported", value: 0, suffix: "" },
    { label: "Resolved Issues", value: 0, suffix: "" },
    { label: "Active Citizens", value: 0, suffix: "" }
  ]);

  useEffect(() => {
    const updateStats = (issuesList: Issue[]) => {
      const resolved = issuesList.filter((issue) => issue.status === "resolved").length;
      const avgResolutionDays = issuesList.length > 0
        ? Math.round(
            issuesList.reduce((sum, issue) => {
              if (!issue.resolvedAt) return sum;
              return sum + Math.max(1, Math.round((issue.resolvedAt - issue.createdAt) / 86400000));
            }, 0) / issuesList.length
          )
        : 0;

      setStats([
        { label: "Issues Reported", value: issuesList.length, suffix: "" },
        { label: "Resolved Issues", value: resolved, suffix: "" },
        { label: "Active Citizens", value: Math.max(1, new Set(issuesList.map(i => i.reportedBy)).size), suffix: "+" }
      ]);
    };

    const loadStats = async () => {
      // Optimistic fast load from local cache
      const local = getLocalIssues();
      updateStats(local);

      // Async load from database
      try {
        const issues = await getAllIssues();
        updateStats(issues);
      } catch (e) {
        console.warn("Failed to load home page statistics:", e);
      }
    };

    loadStats();

    if (typeof window !== "undefined") {
      window.addEventListener("local-issues-updated", loadStats);
      return () => window.removeEventListener("local-issues-updated", loadStats);
    }
  }, []);

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <AnimatedWorker />

        <div className="container" style={{ width: "100%" }}>
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              Powered by Google Gemini AI
            </div>

            <h1 className="hero-title">
              Fix Your City.{" "}
              <span className="gradient-text">Be the Change.</span>
            </h1>

            <p className="hero-description">
              CivicPulse empowers citizens to report, verify, and track
              hyperlocal community issues — from potholes to broken streetlights
              — using AI-powered collaboration and real-time transparency.
            </p>

            <div className="hero-actions">
              <Link href="/report" className="btn btn-primary btn-lg">
                <MapPin size={18} />
                Report an Issue
                <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="btn btn-secondary btn-lg">
                <BarChart3 size={18} />
                View Live Map
              </Link>
            </div>

            {/* Stats */}
            <div className="stats-grid stagger" style={{ marginTop: "60px" }}>
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="stat-card animate-fadeInUp"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="stat-number">
                    <CountUp target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="section" style={{ background: "var(--bg-secondary)" }}>
        <div className="container">
          <div className="text-center mb-6">
            <div
              className="hero-badge"
              style={{ display: "inline-flex", marginBottom: "16px" }}
            >
              <Star size={14} />
              Simple 3-Step Process
            </div>
            <h2>How CivicPulse Works</h2>
            <p style={{ maxWidth: "500px", margin: "16px auto 0" }}>
              From spotting an issue to seeing it resolved — we make civic
              participation effortless.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              marginTop: "48px",
            }}
          >
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="glass-card animate-fadeInUp"
                style={{
                  padding: "32px",
                  animationDelay: `${i * 0.15}s`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: 900,
                    color: "rgba(79,142,247,0.08)",
                    position: "absolute",
                    top: "16px",
                    right: "20px",
                    fontFamily: "Space Grotesk",
                    lineHeight: 1,
                  }}
                >
                  {step.step}
                </div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "var(--gradient-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "Space Grotesk",
                  }}
                >
                  {parseInt(step.step)}
                </div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "0.9rem" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-6">
            <h2>
              Everything You Need to{" "}
              <span className="gradient-text">Fix Your Community</span>
            </h2>
            <p style={{ maxWidth: "500px", margin: "16px auto 0" }}>
              A complete platform for citizens and authorities to collaborate on
              community issue resolution.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
              marginTop: "48px",
            }}
          >
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="glass-card animate-fadeInUp"
                style={{
                  padding: "28px",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    background: `${feature.color}20`,
                    border: `1px solid ${feature.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginBottom: "16px",
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    marginBottom: "10px",
                    color: "var(--text-primary)",
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section
        className="section"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="container">
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(79,142,247,0.15) 0%, rgba(124,58,237,0.15) 100%)",
              border: "1px solid rgba(79,142,247,0.2)",
              borderRadius: "var(--radius-xl)",
              padding: "64px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-80px",
                right: "-80px",
                width: "300px",
                height: "300px",
                background: "var(--brand-primary)",
                borderRadius: "50%",
                filter: "blur(80px)",
                opacity: 0.1,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <Users size={32} style={{ color: "var(--brand-primary)" }} />
              <CheckCircle
                size={32}
                style={{ color: "var(--brand-accent)" }}
              />
              <TrendingUp
                size={32}
                style={{ color: "var(--brand-secondary)" }}
              />
            </div>
            <h2 style={{ marginBottom: "16px", fontSize: "2.5rem" }}>
              Your City Needs{" "}
              <span className="gradient-text">Your Voice</span>
            </h2>
            <p
              style={{
                maxWidth: "500px",
                margin: "0 auto 32px",
                fontSize: "1.1rem",
              }}
            >
              Join thousands of active citizens making their communities safer,
              cleaner, and better — one report at a time.
            </p>
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/register" className="btn btn-primary btn-lg">
                <Shield size={18} />
                Become a Community Hero
              </Link>
              <Link href="/dashboard" className="btn btn-secondary btn-lg">
                <MapPin size={18} />
                Explore the Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "var(--bg-primary)",
          borderTop: "1px solid var(--border-subtle)",
          padding: "32px 0",
          textAlign: "center",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🏙️</span>
            <span
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              Civic<span style={{ color: "var(--brand-primary)" }}>Pulse</span>
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Built with ❤️ for Vibe2Ship Hackathon 2026 | Powered by Google
            Gemini AI & Firebase
          </p>
        </div>
      </footer>
    </>
  );
}
