"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthContext } from "./AuthProvider";
import {
  MapPin,
  BarChart3,
  Trophy,
  Plus,
  LogOut,
  Menu,
  X,
  Shield,
  Home,
} from "lucide-react";
import { LEVEL_COLORS, LEVEL_ICONS } from "@/lib/gamification";

export default function Navbar() {
  const pathname = usePathname();
  const { user, userProfile, logout, loading } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: MapPin },
    { href: "/impact", label: "Impact", icon: BarChart3 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(userProfile ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon">🏙️</div>
          <span>
            Civic<span style={{ color: "var(--brand-primary)" }}>Pulse</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? "active" : ""}
                >
                  <Icon size={15} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Actions */}
        <div className="navbar-actions">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="loading-spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} />
              <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Checking login...
              </span>
            </div>
          ) : user ? (
            <>
              <Link href="/report" className="btn btn-primary btn-sm">
                <Plus size={15} />
                Report Issue
              </Link>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.displayName}
                    className="avatar"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(userProfile?.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {userProfile?.displayName?.split(" ")[0] || "User"}
                  </span>
                  {userProfile && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color:
                          LEVEL_COLORS[userProfile.level] ||
                          "var(--brand-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {LEVEL_ICONS[userProfile.level]} {userProfile.level}
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="btn btn-ghost btn-icon"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Join Now
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: "none" }}
            id="mobile-menu-btn"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div
          style={{
            position: "absolute",
            top: "64px",
            left: 0,
            right: 0,
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 999,
          }}
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  color:
                    pathname === link.href
                      ? "var(--brand-primary)"
                      : "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                }}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
