"use client";

import { useState, useEffect } from "react";
import { getAllIssues } from "@/lib/firestore";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "@/lib/gamification";
import { Issue, AIInsight } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";

interface ChartTooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-normal)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: "0.8rem",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function ImpactPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [, setLoading] = useState(true);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await getAllIssues();
      setIssues(data);
      setLoading(false);
    };
    load();

    if (typeof window !== "undefined") {
      window.addEventListener("local-issues-updated", load);
      return () => window.removeEventListener("local-issues-updated", load);
    }
  }, []);

  const loadInsights = async () => {
    setInsightsLoading(true);
    const { generateInsights } = await import("@/lib/gemini");
    const data = await generateInsights(issues);
    setInsights(data);
    setInsightsLoading(false);
  };

  // Data computations
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved").length;
  const resolutionRate =
    totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

  // Category breakdown
  const categoryData = Object.entries(CATEGORY_CONFIG).map(([key, conf]) => ({
    name: conf.label,
    icon: conf.icon,
    value: issues.filter((i) => i.category === key).length,
    color: conf.color,
  })).filter((d) => d.value > 0);

  // Status breakdown
  const statusData = Object.entries(STATUS_CONFIG)
    .filter(([k]) => k !== "rejected")
    .map(([key, conf]) => ({
      name: conf.label,
      value: issues.filter((i) => i.status === key).length,
      color: conf.color,
    }));

  // Monthly trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const monthStart = new Date(year, date.getMonth(), 1).getTime();
    const monthEnd = new Date(year, date.getMonth() + 1, 0).getTime();
    return {
      month,
      reported: issues.filter((iss) => iss.createdAt >= monthStart && iss.createdAt <= monthEnd).length,
      resolved: issues.filter((iss) => iss.resolvedAt && iss.resolvedAt >= monthStart && iss.resolvedAt <= monthEnd).length,
    };
  });

  // Ward stats
  const wardMap: Record<string, { reported: number; resolved: number }> = {};
  issues.forEach((iss) => {
    const ward = iss.location.ward || "Unknown";
    if (!wardMap[ward]) wardMap[ward] = { reported: 0, resolved: 0 };
    wardMap[ward].reported++;
    if (iss.status === "resolved") wardMap[ward].resolved++;
  });
  const wardData = Object.entries(wardMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.reported - a.reported)
    .slice(0, 8);

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "4px" }}>
            📊 Impact Dashboard
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Real-time community issue resolution analytics
          </p>
        </div>
        <button
          onClick={loadInsights}
          className="btn btn-secondary"
          disabled={insightsLoading}
        >
          {insightsLoading ? <RefreshCw size={15} className="animate-spin" /> : <TrendingUp size={15} />}
          AI Predictions
        </button>
      </div>

      {/* KPI Cards */}
      <div className="impact-kpi-grid">
        {[
          { label: "Total Issues", value: totalIssues, icon: "📋", color: "var(--brand-primary)" },
          { label: "Resolved", value: resolvedIssues, icon: "✅", color: "var(--brand-accent)" },
          { label: "Resolution Rate", value: `${resolutionRate}%`, icon: "📈", color: "#8b5cf6" },
          {
            label: "In Progress",
            value: issues.filter((i) => i.status === "in_progress").length,
            icon: "⚙️",
            color: "var(--brand-warning)",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="glass-card"
            style={{ padding: "20px", textAlign: "center" }}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{kpi.icon}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: kpi.color, fontFamily: "Space Grotesk" }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="glass-card" style={{ padding: "24px", marginBottom: "24px", borderColor: "rgba(124,58,237,0.3)" }}>
          <div className="ai-badge" style={{ marginBottom: "12px" }}>✨ Gemini AI Predictions</div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
            {insights.trendAnalysis}
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {insights.recommendations?.map((r: string, i: number) => (
              <div
                key={i}
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  gap: "6px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: "var(--brand-accent)" }}>✓</span>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="impact-charts-grid">
        {/* Category Pie Chart */}
        <div className="chart-container">
          <div className="chart-title">Issues by Category</div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-normal)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "120px" }}>
              {categoryData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ color: "var(--text-secondary)" }}>{d.icon} {d.name}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "auto" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Bar Chart */}
        <div className="chart-container">
          <div className="chart-title">Issues by Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} barSize={32}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="impact-charts-grid">
        {/* Monthly Trend */}
        <div className="chart-container">
          <div className="chart-title">Monthly Trend (Last 6 Months)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.75rem", color: "#94a3b8" }} />
              <Line type="monotone" dataKey="reported" stroke="#4f8ef7" strokeWidth={2.5} dot={{ fill: "#4f8ef7", r: 4 }} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="#06d6a0" strokeWidth={2.5} dot={{ fill: "#06d6a0", r: 4 }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ward Stats */}
        <div className="chart-container">
          <div className="chart-title">Top Wards by Issue Count</div>
          {wardData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={wardData} barSize={16} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="reported" fill="#4f8ef7" radius={[0, 4, 4, 0]} name="Reported" />
                <Bar dataKey="resolved" fill="#06d6a0" radius={[0, 4, 4, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "180px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No ward data available yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
