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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) setIsAuthenticated(true);
        else { setIsAuthenticated(false); router.replace("/login"); }
      })
      .catch(() => { setIsAuthenticated(false); router.replace("/login"); });
  }, [router]);

  const handleSignOut = () => {
    // TODO: Remove these localStorage calls after ~1 week cleanup
    localStorage.removeItem("agentToken");
    localStorage.removeItem("agentId");
    localStorage.removeItem("agentData");

    fetch("/api/agents/logout", { method: "POST" })
      .catch((err) => console.error("Logout error:", err))
      .finally(() => router.replace("/login"));
  };

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <TopNav
          onSignInClick={handleSignOut}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-auto pt-[60px] px-4 py-4 md:px-6 md:py-6 bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}