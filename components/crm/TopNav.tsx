"use client";

import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   NOTIFICATIONS
   ───────────────────────────────────────────── */
const NOTIFICATIONS = [
  {
    id: 1,
    initial: "D",
    color: "#c9a84c",
    title: "Deal moved to Negotiation",
    desc: "Sophia Chen — Nexus Capital",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    initial: "L",
    color: "#2dd4ab",
    title: "New lead assigned",
    desc: "Prism Analytics via website form",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    initial: "P",
    color: "#7b9ef0",
    title: "Proposal opened",
    desc: "James Thornton viewed your doc",
    time: "3h ago",
    unread: false,
  },
];

/* ─────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────── */
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5A5 5 0 0 0 5 7.5c0 3.5-2 5-2 5h14s-2-1.5-2-5a5 5 0 0 0-5-5zM8.5 16a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}
function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7.5 7.5a2.5 2.5 0 0 1 4.8.8c0 1.7-2.3 2.2-2.3 3.2M10 14.5h.01" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5l3.5 3.5" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   PAGE META
   ───────────────────────────────────────────── */
function getPageMeta(pathname: string): { title: string; crumb: string } {
  if (pathname === "/")                 return { title: "Dashboard",  crumb: "Overview" };
  if (pathname.startsWith("/agents"))   return { title: "Agents",     crumb: "Management" };
  if (pathname.startsWith("/domains"))  return { title: "Domains",    crumb: "Management" };
  if (pathname.startsWith("/settings")) return { title: "Settings",   crumb: "System" };
  return { title: "Dashboard", crumb: "Overview" };
}

/* ─────────────────────────────────────────────
   ICON BUTTON
   ───────────────────────────────────────────── */
function NavIconBtn({
  tooltip,
  children,
  onClick,
}: {
  tooltip?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const btn = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg shrink-0"
    >
      {children}
    </Button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom"><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  );
}

/* ─────────────────────────────────────────────
   SEARCH
   ───────────────────────────────────────────── */
function SearchBar() {
  return (
    <div className="relative w-72">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="Search contacts, deals…"
        className="pl-10 pr-16 h-9 text-[13.5px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 items-center rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
        ⌘K
      </kbd>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS
   ───────────────────────────────────────────── */
function NotificationButton() {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg shrink-0"
        >
          <BellIcon className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[380px] p-0 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground">
            Mark all read
          </Button>
        </div>

        {/* Items */}
        <div className="divide-y divide-border">
          {NOTIFICATIONS.map((n) => (
            <button
              key={n.id}
              className={cn(
                "w-full flex gap-3.5 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors",
                n.unread && "bg-muted/30"
              )}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                style={{ background: `${n.color}22`, color: n.color }}
              >
                {n.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13.5px] leading-snug mb-0.5",
                  n.unread ? "font-semibold text-foreground" : "text-foreground/80"
                )}>
                  {n.title}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">{n.desc}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                {n.unread && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t">
          <Button variant="ghost" className="w-full h-10 text-[13px] text-muted-foreground hover:text-foreground rounded-none rounded-b-lg">
            View all notifications →
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────────────────────────
   TOP NAV
   ───────────────────────────────────────────── */
export default function TopNav({
  onSignInClick,
}: {
  onSignInClick?: () => void;
}) {
  const pathname = usePathname();
  const { title, crumb } = getPageMeta(pathname);

  return (
    <TooltipProvider delayDuration={200}>
      {/* left-64 matches the new sidebar w-64 (256px) */}
      <header className="fixed top-0 left-64 right-0 h-[60px] bg-background/95 backdrop-blur-sm border-b border-border flex items-center px-6 z-30 gap-5">

        {/* Page Title + Breadcrumb */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-none">
            {title}
          </h1>
          <span className="text-muted-foreground/50 text-[15px] leading-none hidden sm:block">/</span>
          <span className="text-[13.5px] text-muted-foreground font-medium leading-none hidden sm:block">
            {crumb}
          </span>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <NotificationButton />
          <NavIconBtn tooltip="Quick add (N)">
            <PlusIcon className="w-[18px] h-[18px]" />
          </NavIconBtn>
          <NavIconBtn tooltip="Help & docs">
            <HelpCircleIcon className="w-[18px] h-[18px]" />
          </NavIconBtn>

          <Separator orientation="vertical" className="h-5 mx-2" />

          <button
            onClick={onSignInClick}
            className="inline-flex items-center gap-1.5 bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background text-[13px] font-semibold rounded-lg px-4 h-9 transition-colors leading-none cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </header>
    </TooltipProvider>
  );
}