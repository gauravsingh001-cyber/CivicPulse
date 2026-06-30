import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import ClientChatBot from "@/components/ClientChatBot";

export const metadata: Metadata = {
  title: "CivicPulse — Community Hero: Hyperlocal Problem Solver",
  description:
    "Empowering citizens to report, track, and resolve community infrastructure issues through AI-powered collaboration and real-time transparency.",
  keywords: [
    "civic",
    "community",
    "infrastructure",
    "pothole",
    "reporting",
    "AI",
    "India",
  ],
  openGraph: {
    title: "CivicPulse — Fix Your Community",
    description: "Report and track hyperlocal community issues with AI power",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-layout">
        {/* Urban City Grid / Blueprint Background Overlay */}
        <div className="city-bg-overlay" />
        
        <AuthProvider>
          <Navbar />
          <main className="page-wrapper">{children}</main>
          <ClientChatBot />
          <Toaster
            position="top-right"
            toastOptions={{
              className: "toast",
              duration: 3000,
              style: {
                background: "#1A1D24",
                color: "#f1f5f9",
                border: "1px solid #FF5A00",
                borderLeft: "4px solid #FF5A00",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                borderRadius: "4px",
                fontFamily: "var(--font-outfit, 'Outfit', sans-serif)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
