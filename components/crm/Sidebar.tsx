"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   NAV CONFIG
   ───────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ icon: LayoutIcon, label: "Dashboard", href: "/", badge: null }],
  },
  {
    label: "Management",
    items: [
      { icon: UsersIcon,  label: "Agents",  href: "/agents",  badge: "" },
      { icon: GlobeIcon,  label: "Domains", href: "/domains", badge: null },
    ],
  },
  {
    label: "System",
    items: [
      { icon: SettingsIcon, label: "Settings", href: "/settings", badge: null },
    ],
  },
];

/* ─────────────────────────────────────────────
   ICONS  (20 × 20 viewport for visual weight)
   ───────────────────────────────────────────── */
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
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3.5" />
      <path d="M1.5 17.5c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M14.5 4a3.5 3.5 0 0 1 0 7M18.5 17.5c0-3-2-5.2-4.5-5.8" />
    </svg>
  );
}
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 2.5c-3 3-4 5-4 7.5s1 4.5 4 7.5M10 2.5c3 3 4 5 4 7.5s-1 4.5-4 7.5M2.5 10h15" />
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

/* ─────────────────────────────────────────────
   NAV ITEM  — 36px tall, 15px text (matches Linear)
   ───────────────────────────────────────────── */
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
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <Icon
        className={cn(
          "w-[18px] h-[18px] shrink-0",
          active
            ? "text-foreground"
            : "text-muted-foreground group-hover:text-foreground transition-colors"
        )}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className={cn(
            "flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[11px] font-semibold leading-none",
            active
              ? "bg-foreground/10 text-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR  — w-64 gives ample breathing room
   ───────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col fixed inset-y-0 left-0 z-40">

      {/* ── Logo — exact same height as TopNav ── */}
      <div className="h-[60px] px-5 flex items-center gap-3 border-b border-border shrink-0">
        <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-[14px] font-extrabold text-background tracking-tight">R</span>
        </div>
        <div>
          <div className="text-[16px] font-semibold text-foreground leading-tight tracking-tight">
            Rexon
          </div>
          <div className="text-[11px] text-muted-foreground font-medium tracking-wide leading-tight mt-0.5">
            CRM Platform
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/55 px-2.5 mb-1.5">
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
            <button className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-md hover:bg-accent transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-background">JR</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-foreground leading-tight truncate">
                  Jordan Reed
                </div>
                <div className="text-[11.5px] text-muted-foreground leading-tight mt-0.5 truncate">
                  jordan@rexon.io
                </div>
              </div>
              <ChevronUpIcon className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-60 mb-1">
            <div className="px-3 py-2.5">
              <p className="text-[13.5px] font-semibold text-foreground">Jordan Reed</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">jordan@rexon.io · Admin</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13.5px] gap-2.5 py-2 px-3">
              <UserIcon className="w-[16px] h-[16px] shrink-0" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13.5px] gap-2.5 py-2 px-3">
              <SettingsIcon className="w-[16px] h-[16px] shrink-0" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13.5px] text-destructive focus:text-destructive gap-2.5 py-2 px-3">
              <LogOutIcon className="w-[16px] h-[16px] shrink-0" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}