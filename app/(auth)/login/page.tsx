"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/components/AuthProvider";
import { FirebaseError } from "firebase/app";
import { LogIn, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function getAuthErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof FirebaseError)) return fallback;

  if (err.code === "auth/configuration-not-found") {
    return "Firebase Authentication is not enabled for this project. Enable Email/Password and Google sign-in in Firebase Console.";
  }

  return err.message || fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");
    const toastId = toast.loading("Logging you in...");

    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back! 👋", { id: toastId });
      router.push("/dashboard");
    } catch (err: unknown) {
      console.warn("Handled login error:", getAuthErrorMessage(err, "Invalid email or password."));
      setError(getAuthErrorMessage(err, "Invalid email or password."));
      toast.error("Login failed.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const toastId = toast.loading("Signing in with Google...");

    try {
      await signInWithGoogle();
      toast.success("Welcome back! 👋", { id: toastId });
      router.push("/dashboard");
    } catch (err: unknown) {
      console.warn("Handled Google sign-in error:", getAuthErrorMessage(err, "Google sign-in was aborted."));
      setError(getAuthErrorMessage(err, "Google sign-in was aborted."));
      toast.error("Sign-in failed.", { id: toastId });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "36px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontSize: "2.5rem" }}>🏙️</span>
          <h2 style={{ fontSize: "1.75rem", marginTop: "12px", marginBottom: "6px" }}>
            Welcome Back
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Login to your CivicPulse citizen account
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "var(--radius-md)",
              padding: "12px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--brand-danger)",
              fontSize: "0.8rem",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <div className="loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "24px 0",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span style={{ padding: "0 10px" }}>Or login with</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="btn btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <div className="loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
          ) : (
            <svg style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24">
              <path
                fill="#ea4335"
                d="M12 5.04c1.63 0 3.1.56 4.25 1.66l3.18-3.18C17.5 1.65 14.97 1 12 1 7.35 1 3.39 3.68 1.48 7.58l3.76 2.92C6.12 7.54 8.84 5.04 12 5.04z"
              />
              <path
                fill="#4285f4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.54h6.44c-.28 1.47-1.11 2.72-2.36 3.56v2.96h3.8c2.23-2.06 3.61-5.09 3.61-8.72z"
              />
              <path
                fill="#fbbc05"
                d="M5.24 14.68c-.25-.75-.39-1.56-.39-2.4s.14-1.65.39-2.4L1.48 6.96C.53 8.88 0 11.04 0 13.3c0 2.26.53 4.42 1.48 6.34l3.76-2.96z"
              />
              <path
                fill="#34a853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.8-2.96c-1.05.7-2.4 1.13-4.16 1.13-3.16 0-5.88-2.5-6.84-5.46L1.4 15.76C3.31 19.68 7.27 23 12 23z"
              />
            </svg>
          )}
          {googleLoading ? "Connecting..." : "Google Sign-In"}
        </button>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
