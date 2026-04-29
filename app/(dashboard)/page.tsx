"use client";

import { useState, useEffect } from "react";
import {
  Loader2, AlertCircle, MapPin, Building2, Phone, Mail,
  ExternalLink, ChevronRight, LayoutGrid, Users, Activity
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface AgentProfile {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  agency_name?: string;
  city?: string;
  status: string;
  profile_photo_s3_url?: string;
}

interface FooterLink {
  label: string;
  url: string;
}

interface DashboardSettings {
  hero_background_url?: string;
  hero_background_color?: string;
  hero_title?: string;
  hero_subtitle?: string;
  footer_text?: string;
  footer_links?: FooterLink[];
  footer_show_contact?: boolean;
}



function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const DEFAULT_SETTINGS: DashboardSettings = {
  hero_background_color: "#134c52",
  hero_title: "Welcome to Your Portal",
  hero_subtitle: "Manage your listings, track leads, and grow your real estate business.",
  footer_text: "© {year} Rexon Properties. All rights reserved.",
  footer_links: [
    { label: "Support", url: "#" },
    { label: "Privacy Policy", url: "#" },
    { label: "Terms", url: "#" },
  ],
  footer_show_contact: true,
};

// const QUICK_LINKS = [
//   { label: "My Listings", icon: LayoutGrid, href: "#" },
//   { label: "Active Leads", icon: Users, href: "#" },
//   { label: "Performance", icon: Activity, href: "#" },
// ];

export default function DashboardPage() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          setError("Session expired. Please log in again.");
          setLoading(false);
          return;
        }
        const meData = await meRes.json();
        const agentId = meData.agent.id;

        const [agentRes, settingsRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/agents/${agentId}/dashboard-settings`),
        ]);

        if (!agentRes.ok) {
          const data = await agentRes.json();
          throw new Error(data.error || "Failed to fetch agent");
        }

        const agentData = await agentRes.json();
        setAgent(agentData.agent);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setSettings((prev) => ({ ...prev, ...settingsData.settings }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-[14px] text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl sm:py-10 py-4">
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[14px] font-semibold text-destructive mb-1">Error Loading Dashboard</h3>
              <p className="text-[13px] text-destructive/80">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const hasBgImage = !!settings.hero_background_url;

  const heroStyle: React.CSSProperties = hasBgImage
    ? {
        backgroundImage: `url(${settings.hero_background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : {
        backgroundColor: settings.hero_background_color || "#134c52",
      };

  const footerText = (settings.footer_text || DEFAULT_SETTINGS.footer_text || "")
    .replace("{year}", new Date().getFullYear().toString());

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] my-10">

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ ...heroStyle, minHeight: "460px" }}
      >
        {/* Overlays */}
        {hasBgImage ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 20% 40%, rgba(19,168,180,0.42) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background: `radial-gradient(ellipse 50% 50% at 80% 60%, rgba(208,118,72,0.38) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
                backgroundSize: "48px 48px",
              }}
            />
          </>
        )}

        {/* Content — vertically distributed in the tall hero */}
        <div
          className="relative z-10 flex flex-col justify-between px-8 md:px-12 lg:px-16 py-12 md:py-16"
          style={{ minHeight: "460px" }}
        >
          {/* Top row: greeting + agent card */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

            {/* Left: greeting + name */}
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brand-icon-primary/90 mb-3">
                Welcome to Agent Dashboard
              </p>
              <h1
                className="text-[48px] sm:text-[60px] lg:text-[68px] font-black text-white leading-none tracking-tight mb-5"
                style={{ fontVariationSettings: "'wght' 900" }}
              >
                {agent ? getFirstName(agent.full_name) : "—"}
                <span className="text-white/15">.</span>
              </h1>
              {settings.hero_subtitle && (
                <p className="text-[14px] sm:text-[15px] text-white/50 max-w-md leading-relaxed">
                  {settings.hero_subtitle}
                </p>
              )}
            </div>

            {/* Right: Agent identity card */}
            {agent && (
              <div className="shrink-0">
                <div className="flex items-center gap-4 bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-2xl px-5 py-4 shadow-2xl">
                  {agent.profile_photo_s3_url ? (
                    <img
                      src={agent.profile_photo_s3_url}
                      alt={agent.full_name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 shrink-0 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border-2 border-white/10 shadow-lg">
                      <span className="text-[20px] font-bold text-white">{getInitials(agent.full_name)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-white leading-snug truncate max-w-[180px]">
                      {agent.full_name}
                    </p>
                    {agent.agency_name && (
                      <p className="text-[11.5px] text-white/55 mt-1 flex items-center gap-1.5 truncate">
                        <Building2 className="w-3 h-3 shrink-0 text-white/40" />
                        {agent.agency_name}
                      </p>
                    )}
                    {agent.city && (
                      <p className="text-[11.5px] text-white/55 mt-0.5 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-white/40" />
                        {agent.city}
                      </p>
                    )}
                    <span
                      className={`inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                        agent.status === "approved"
                          ? "bg-brand-secondary/20 text-white/95 border border-brand-secondary/45"
                          : "bg-brand-primary/20 text-white/95 border border-brand-primary/40"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          agent.status === "approved" ? "bg-brand-secondary" : "bg-brand-primary"
                        }`}
                      />
                      {agent.status === "approved" ? "Active" : agent.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom row: quick-action pill buttons */}
          {/* <div className="flex flex-wrap items-center gap-2 mt-10">
            {QUICK_LINKS.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                className="group flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/[0.22] backdrop-blur-sm rounded-full px-4 py-2 transition-all duration-200"
              >
                <Icon className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
                <span className="text-[12px] font-medium text-white/60 group-hover:text-white/90 transition-colors">
                  {label}
                </span>
                <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
              </a>
            ))}
          </div> */}
        </div>
      </section>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <section className="flex-1 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5 border border-brand-secondary/20 bg-card min-h-[160px] flex items-center justify-center shadow-sm">
            <p className="text-[13px] text-muted-foreground/50">Recent Listings will appear here</p>
          </Card>
          <Card className="p-5 border border-brand-secondary/20 bg-card min-h-[160px] flex items-center justify-center shadow-sm">
            <p className="text-[13px] text-muted-foreground/50">Lead Activity</p>
          </Card>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-brand-secondary/25 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-brand-blue-deep">{footerText}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {(settings.footer_links || []).map((link, i) => (
              <a
                key={i}
                href={link.url || "#"}
                target={link.url && link.url !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-brand-blue-deep hover:text-brand-orange-text-hover transition-colors flex items-center gap-1"
              >
                {link.label}
                {link.url && link.url !== "#" && <ExternalLink className="w-3 h-3" />}
              </a>
            ))}
          </div>
        </div>

        {settings.footer_show_contact && agent && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5">
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center gap-1.5 text-[11.5px] text-brand-blue-deep/85 hover:text-brand-orange-text-hover transition-colors"
              >
                <Mail className="w-3 h-3 shrink-0 text-brand-icon-primary" />
                {agent.email}
              </a>
            )}
            {agent.mobile_number && (
              <a
                href={`tel:${agent.mobile_number}`}
                className="flex items-center gap-1.5 text-[11.5px] text-brand-blue-deep/85 hover:text-brand-orange-text-hover transition-colors"
              >
                <Phone className="w-3 h-3 shrink-0 text-brand-icon-primary" />
                {agent.mobile_number}
              </a>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}