"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Building } from "lucide-react";

interface AgentData {
  id: string;
  full_name: string;
  email: string;
  agency_name?: string;
  profile_photo_s3_url?: string;
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ icon: LayoutIcon, label: "Dashboard", href: "/", badge: null }],
  },
  {
    label: "Properties",
    items: [{ icon: Building, label: "Properties", href: "/property", badge: null }],
  },
  {
    label: "System",
    items: [
      { icon: SettingsIcon, label: "Settings", href: "/settings", badge: null },
    ],
  },
];

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.8" />
      <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3M4.1 4.1l2.1 2.1M13.8 13.8l2.1 2.1M4.1 15.9l2.1-2.1M13.8 6.2l2.1-2.1" />
    </svg>
  );
}
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 17h3M13.5 14.5l4-4.5-4-4.5M17.5 10H8" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M3 18c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
    </svg>
  );
}
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12.5l4-5 4 5" />
    </svg>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  badge,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[14.5px] font-medium leading-none tracking-[-0.01em] transition-colors duration-100 select-none",
        active
          ? "bg-brand-secondary/15 text-brand-secondary"
          : "text-muted-foreground hover:text-brand-icon-primary hover:bg-brand-secondary/5"
      )}
    >
      <Icon
        className={cn(
          "w-[18px] h-[18px] shrink-0",
          active
            ? "text-brand-secondary"
            : "text-brand-icon-primary group-hover:text-brand-secondary transition-colors"
        )}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className={cn(
            "flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[11px] font-semibold leading-none",
            active
              ? "bg-brand-secondary/20 text-brand-secondary"
              : "bg-brand-secondary/10 text-brand-secondary"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentData | null>(null);

  // ✅ Extracted into useCallback so the event listener can reference the same function
  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.agent) setAgent(data.agent);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  // ✅ Listen for profile photo updates dispatched by SettingsPage
  useEffect(() => {
    const handler = (e: Event) => {
      const { profile_photo_s3_url } = (e as CustomEvent).detail as { profile_photo_s3_url: string };
      // Optimistically update the URL without a full re-fetch
      setAgent((prev) => prev ? { ...prev, profile_photo_s3_url } : prev);
    };
    window.addEventListener("profilePhotoUpdated", handler);
    return () => window.removeEventListener("profilePhotoUpdated", handler);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleSignOut = () => {
    localStorage.removeItem("agentToken");
    localStorage.removeItem("agentId");
    localStorage.removeItem("agentData");

    fetch("/api/agents/logout", { method: "POST" })
      .catch((err) => console.error("Logout error:", err))
      .finally(() => {
        router.replace("/login");
      });
  };

  const initials = agent ? getInitials(agent.full_name) : "–";

  return (
    <aside
      className={cn(
        "w-64 bg-card border-r border-border flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      <div className="h-[60px] px-5 flex items-center gap-3 border-b border-border shrink-0">
        <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-[14px] font-extrabold text-white tracking-tight">R</span>
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold text-foreground leading-tight tracking-tight">
            Rexon
          </div>
          <div className="text-[11px] text-muted-foreground font-medium tracking-wide leading-tight mt-0.5">
            Agent Portal
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md hover:bg-brand-secondary/10 text-brand-icon-primary hover:text-brand-secondary transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-blue-deep px-2.5 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  active={isActive(item.href)}
                  badge={item.badge}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      {/* ── User Profile ─────────────────────── */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-md hover:bg-brand-secondary/10 transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary">
              {/* ✅ Avatar — reflects updated URL immediately */}
              {agent?.profile_photo_s3_url ? (
                <img
                  src={agent.profile_photo_s3_url}
                  alt={agent.full_name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-brand-secondary/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white">{initials}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-foreground leading-tight truncate">
                  {agent?.full_name ?? "Loading…"}
                </div>
                <div className="text-[11.5px] text-muted-foreground leading-tight mt-0.5 truncate">
                  {agent?.email ?? ""}
                </div>
              </div>
              <ChevronUpIcon className="w-4 h-4 text-brand-icon-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-60 mb-1">
            <div className="px-3 py-2.5">
              <p className="text-[13.5px] font-semibold text-foreground">
                {agent?.full_name ?? "Agent"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                {agent?.email ?? ""}
                {agent?.agency_name ? ` · ${agent.agency_name}` : ""}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-[13.5px] gap-2.5 py-2 px-3 cursor-pointer">
              <Link href="/profile">
                <UserIcon className="w-[16px] h-[16px] shrink-0" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13.5px] gap-2.5 py-2 px-3 cursor-pointer">
              <Link href="/settings">
                <SettingsIcon className="w-[16px] h-[16px] shrink-0" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[13.5px] text-destructive focus:text-destructive gap-2.5 py-2 px-3 cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOutIcon className="w-[16px] h-[16px] shrink-0" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}