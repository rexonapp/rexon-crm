"use client";

import Sidebar from "@/components/crm/Sidebar";
import TopNav from "@/components/crm/TopNav";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 🔐 Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem("agentToken");

    if (!token) {
      router.replace("/login"); // redirect to login
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleSignOut = () => {
    const token = localStorage.getItem("agentToken");

    localStorage.removeItem("agentToken");
    localStorage.removeItem("agentId");
    localStorage.removeItem("agentData");

    if (token) {
      fetch("/api/agents/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => console.error("Logout error:", err));
    }

    router.replace("/login");
  };

  // ⏳ Prevent render before auth check
  if (isAuthenticated === null) {
    return null; // or loading spinner
  }

  // ❌ Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // ✅ Authenticated → render dashboard
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <TopNav onSignInClick={handleSignOut} />

        <main className="flex-1 overflow-auto pt-[60px] px-6 py-6 bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}