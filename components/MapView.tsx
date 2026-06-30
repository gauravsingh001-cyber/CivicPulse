"use client";

import { useEffect, useRef, useState } from "react";
import { Issue } from "@/types";
import { CATEGORY_CONFIG } from "@/lib/gamification";
import type * as Leaflet from "leaflet";

interface MapViewProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: {
    southWest: { lat: number; lng: number };
    northEast: { lat: number; lng: number };
  }) => void;
}

export default function MapView({
  issues,
  onIssueClick,
  center = [28.6139, 77.209],
  zoom = 12,
  onBoundsChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.Marker[]>([]);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const [mapReady, setMapReady] = useState(false);

  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    let active = true;
    if (typeof window === "undefined") return;

    // Dynamically import Leaflet
    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!active) return;
      leafletRef.current = L;

      if (mapInstanceRef.current || !mapRef.current) return;

      // Create map
      const map = L.map(mapRef.current, {
        center: initialCenterRef.current,
        zoom: initialZoomRef.current,
        zoomControl: true,
      });

      // Dark tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const triggerBoundsUpdate = () => {
        if (!onBoundsChangeRef.current) return;
        const b = map.getBounds();
        onBoundsChangeRef.current({
          southWest: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
          northEast: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
        });
      };

      map.whenReady(triggerBoundsUpdate);
      map.on("moveend", triggerBoundsUpdate);

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const map = mapInstanceRef.current;
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const [lat, lng] = center;
    const latDiff = Math.abs(currentCenter.lat - lat);
    const lngDiff = Math.abs(currentCenter.lng - lng);
    const zoomDiff = Math.abs(currentZoom - zoom);

    // Only set view if coordinates or zoom level have meaningfully changed
    if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomDiff > 0.1) {
      map.setView(center, zoom);
    }
  }, [center, zoom, mapReady]);

  // Update markers when issues change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const L = leafletRef.current;
    if (!L) return;
    const map = mapInstanceRef.current;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for each issue
    issues.forEach((issue) => {
      if (!issue.location?.lat || !issue.location?.lng) return;

      const conf = CATEGORY_CONFIG[issue.category];
      const color = conf?.color || "#4f8ef7";

      // Custom SVG icon
      const svgIcon = L.divIcon({
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); font-size: 12px; position: absolute;">
              ${conf?.icon || "📍"}
            </span>
          </div>
        `,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([issue.location.lat, issue.location.lng], {
        icon: svgIcon,
      }).addTo(map);

      // Popup content
      const statusColors: Record<string, string> = {
        reported: "#6b7280",
        verified: "#3b82f6",
        assigned: "#8b5cf6",
        in_progress: "#f59e0b",
        resolved: "#10b981",
        rejected: "#ef4444",
      };

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 200px; padding: 4px;">
          <div style="font-weight: 700; font-size: 0.9rem; color: #f1f5f9; margin-bottom: 8px; line-height: 1.3;">
            ${issue.title}
          </div>
          <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: ${color}25; color: ${color}; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 600;">
              ${conf?.icon} ${conf?.label}
            </span>
            <span style="background: ${statusColors[issue.status]}25; color: ${statusColors[issue.status]}; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 600;">
              ${issue.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 10px;">
            📍 ${issue.location.address?.split(",").slice(0, 2).join(",") || "Unknown location"}
          </div>
          <div style="display: flex; gap: 12px; font-size: 0.7rem; color: #64748b; margin-bottom: 10px;">
            <span>👍 ${issue.upvotes || 0}</span>
            <span>✅ ${(issue.verifiedBy || []).length}</span>
          </div>
          <button
            onclick="window.location.href='/issues/${issue.id}'"
            style="
              background: linear-gradient(135deg, #4f8ef7, #7c3aed);
              color: white;
              border: none;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
            "
          >
            View Details →
          </button>
        </div>
      `);

      marker.on("click", () => {
        if (onIssueClick) onIssueClick(issue);
      });

      markersRef.current.push(marker);
    });
  }, [issues, mapReady, onIssueClick]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "var(--radius-lg)",
        }}
      />
      {!mapReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Loading map...
            </p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          background: "rgba(8,12,20,0.9)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          zIndex: 1000,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
            marginBottom: "8px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Issue Categories
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 12px",
          }}
        >
          {Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([key, conf]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: conf.color,
                  flexShrink: 0,
                }}
              />
              {conf.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
