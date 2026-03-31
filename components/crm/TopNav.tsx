"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AgentData {
  id: string;
  full_name: string;
  email: string;
  agency_name?: string;
  profile_photo_s3_url?: string;
}
interface AgentNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}


function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifIcon(type: string): { bg: string; color: string; initial: string } {
  if (type.includes('approved'))    return { bg: '#16a34a22', color: '#16a34a', initial: '✓' };
  if (type.includes('rejected'))    return { bg: '#dc262622', color: '#dc2626', initial: '✕' };
  if (type.includes('deactivated')) return { bg: '#71717a22', color: '#71717a', initial: '–' };
  if (type.includes('warehouse'))   return { bg: '#2563eb22', color: '#2563eb', initial: 'W' };
  if (type.includes('property'))    return { bg: '#c9a84c22', color: '#c9a84c', initial: 'P' };
  if (type.includes('domain'))      return { bg: '#7b9ef022', color: '#7b9ef0', initial: 'D' };
  return                                   { bg: '#2dd4ab22', color: '#2dd4ab', initial: 'N' };
}


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
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 17h3M13.5 14.5l4-4.5-4-4.5M17.5 10H8" />
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
  className,
}: {
  tooltip?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const btn = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg shrink-0", className)}
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
   NOTIFICATIONS
   ───────────────────────────────────────────── */
   function NotificationButton() {
    const [notifications, setNotifications] = useState<AgentNotification[]>([]);
    const [showAll, setShowAll]             = useState(false);
    const pollRef                           = useRef<ReturnType<typeof setInterval> | null>(null);
  
    const PREVIEW_COUNT = 4;
    const unreadCount   = notifications.filter(n => !n.is_read).length;
    const preview       = notifications.slice(0, PREVIEW_COUNT);
    const hasMore       = notifications.length > PREVIEW_COUNT;
  
    // ── Fetch ──
    const fetchNotifications = useCallback(async () => {
      try {
        const res  = await fetch('/api/agents/notifications');
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch { /* silent */ }
    }, []);
  
    // ── Poll every 10s ──
    useEffect(() => {
      fetchNotifications();
      pollRef.current = setInterval(fetchNotifications, 10_000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchNotifications]);
  
    // ── Mark single read ──
    const markRead = useCallback(async (id: number) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      try {
        await fetch(`/api/agents/notifications/${id}/read`, { method: 'PATCH' });
      } catch {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      }
    }, []);
  
    const markAllRead = useCallback(async () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      try {
        await fetch('/api/agents/notifications/read-all', { method: 'PATCH' });
      } catch {
        fetchNotifications();
      }
    }, [fetchNotifications]);
  
    const deleteNotif = useCallback(async (id: number) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      try {
        await fetch(`/api/agents/notifications/${id}`, { method: 'DELETE' });
      } catch {
        fetchNotifications();
      }
    }, [fetchNotifications]);
  
    return (
      <>
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
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={markAllRead}
                  className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Mark all read
                </Button>
              )}
            </div>
  
            {/* Preview list — max 4 */}
            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <BellIcon className="w-8 h-8 opacity-30" />
                  <p className="text-[13px] font-medium">All caught up!</p>
                  <p className="text-[12px]">No notifications yet</p>
                </div>
              ) : (
                preview.map(n => {
                  const icon = notifIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.is_read) markRead(n.id); }}
                      className={cn(
                        'w-full flex gap-3.5 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors group',
                        !n.is_read && 'bg-muted/30'
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{ background: icon.bg, color: icon.color }}
                      >
                        {icon.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[13.5px] leading-snug mb-0.5',
                          !n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'
                        )}>
                          {n.title}
                        </p>
                        <p className="text-[12px] text-muted-foreground line-clamp-2">{n.message}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                        <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                          {timeAgo(n.created_at)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <span
                            role="button"
                            onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive text-[10px]"
                          >
                            ✕
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
  
            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t">
                {hasMore ? (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAll(true)}
                    className="w-full h-10 text-[13px] text-muted-foreground hover:text-foreground rounded-none rounded-b-lg"
                  >
                    See all {notifications.length} notifications →
                  </Button>
                ) : (
                  <p className="text-center text-[11px] text-muted-foreground py-2.5">
                    Showing all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
  
        {/* ── All notifications modal ── */}
        {showAll && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAll(false)}
          >
            <div
              className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 flex flex-col overflow-hidden"
              style={{ maxHeight: '80dvh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <BellIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[15px] font-semibold text-foreground">All Notifications</span>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead}
                      className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground">
                      Mark all read
                    </Button>
                  )}
                  <button
                    onClick={() => setShowAll(false)}
                    className="w-7 h-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors text-[14px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
  
              {/* Modal list */}
              <div className="flex-1 overflow-y-auto divide-y divide-border"
                style={{ scrollbarWidth: 'thin' }}>
                {notifications.map(n => {
                  const icon = notifIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.is_read) markRead(n.id); }}
                      className={cn(
                        'w-full flex gap-3.5 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors group',
                        !n.is_read && 'bg-muted/30'
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{ background: icon.bg, color: icon.color }}
                      >
                        {icon.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[13.5px] leading-snug mb-0.5',
                          !n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'
                        )}>
                          {n.title}
                        </p>
                        <p className="text-[12px] text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive text-[10px] mt-auto"
                        >
                          ✕
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
  
              {/* Modal footer */}
              <div className="border-t px-5 py-3 text-center flex-shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────────────────────────────────────────
   TOP NAV
   ───────────────────────────────────────────── */
export default function TopNav({
  onSignInClick,
  onMenuClick,
}: {
  onSignInClick?: () => void;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const { title, crumb } = getPageMeta(pathname);
  const [agent, setAgent] = useState<AgentData | null>(null);

  // ✅ Extracted so the event listener can reference the same stable function
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

  // ✅ Listen for photo updates dispatched by SettingsPage and update optimistically
  useEffect(() => {
    const handler = (e: Event) => {
      const { profile_photo_s3_url } = (e as CustomEvent).detail as { profile_photo_s3_url: string };
      setAgent((prev) => prev ? { ...prev, profile_photo_s3_url } : prev);
    };
    window.addEventListener("profilePhotoUpdated", handler);
    return () => window.removeEventListener("profilePhotoUpdated", handler);
  }, []);

  const initials = agent ? getInitials(agent.full_name) : "–";

  return (
    <TooltipProvider delayDuration={200}>
      <header className="fixed top-0 left-0 right-0 lg:left-64 h-[60px] bg-background/95 backdrop-blur-sm border-b border-border flex items-center px-4 md:px-6 z-30 gap-3 md:gap-5">

        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>

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

        {/* Actions */}
        <div className="flex items-center gap-1">
          <NotificationButton />

          <Separator orientation="vertical" className="h-5 mx-2 hidden sm:block" />

          {/* ✅ Agent identity — photo updates immediately via event */}
          <div className="flex items-center gap-2.5 mr-1">
            {agent?.profile_photo_s3_url ? (
              <img
                src={agent.profile_photo_s3_url}
                alt={agent.full_name}
                className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-background">{initials}</span>
              </div>
            )}
            {agent && (
              <div className="hidden md:block leading-tight">
                <p className="text-[13px] font-semibold text-foreground truncate max-w-[130px]">
                  {agent.full_name}
                </p>
                {agent.agency_name && (
                  <p className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                    {agent.agency_name}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onSignInClick}
            className="inline-flex items-center gap-1.5 border border-border hover:bg-accent text-foreground text-[13px] font-medium rounded-lg px-3 h-9 transition-colors leading-none cursor-pointer"
          >
            <LogOutIcon className="w-[15px] h-[15px]" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>
    </TooltipProvider>
  );
}