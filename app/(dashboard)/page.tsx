//(dashoboard)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Building2,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Globe,
  XCircle,
  Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */
interface AgentProfile {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number?: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  agency_name: string;
  bio?: string;
  languages_spoken?: string;
  profile_photo_s3_url?: string;
  kyc_document_s3_url?: string;
  is_verified: boolean;
  status: string;
  invite_status: string;
  terms_accepted: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentDomain {
  id: string;
  domain_name: string;
  full_domain: string;
  status: string;
  is_active: boolean;
  checked_at?: string;
  activated_at?: string;
  created_at: string;
}

/* ─────────────────────────────────────────────
   INFO ROW
   ───────────────────────────────────────────── */
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | undefined;
  icon?: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 text-[13px]">
      {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground">{label}</p>
        <p className="text-foreground font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DOMAIN CARD
   ───────────────────────────────────────────── */
function DomainCard({ domain }: { domain: AgentDomain }) {
  const isActive = domain.is_active;
  const statusLabel =
    domain.status === "active"
      ? "Active"
      : domain.status === "pending"
      ? "Pending"
      : domain.status === "released"
      ? "Released"
      : domain.status;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {domain.full_domain || domain.domain_name}
            </p>
            {domain.full_domain && domain.domain_name !== domain.full_domain && (
              <p className="text-[11px] text-muted-foreground truncate">
                {domain.domain_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="text-[10px] gap-1"
          >
            {isActive ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {statusLabel}
          </Badge>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-1.5 text-[12px]">
        {domain.activated_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Activated</span>
            <span className="text-foreground font-medium">
              {new Date(domain.activated_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
        {domain.checked_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last checked
            </span>
            <span className="text-foreground font-medium">
              {new Date(domain.checked_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Added</span>
          <span className="text-foreground font-medium">
            {new Date(domain.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD PAGE
   ───────────────────────────────────────────── */
export default function DashboardPage() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [domains, setDomains] = useState<AgentDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agentId = localStorage.getItem("agentId");
        const token = localStorage.getItem("agentToken");

        if (!agentId || !token) {
          setError("Session expired. Please log in again.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/agents/${agentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch profile");
        }

        const data = await res.json();
        setAgent(data.agent);
        setDomains(data.domains || []);
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
        <p className="text-[14px] text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl">
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[14px] font-semibold text-destructive mb-1">
                Error Loading Dashboard
              </h3>
              <p className="text-[13px] text-destructive/80">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-7xl">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-[14px] text-muted-foreground">No agent data found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center sm:items-start gap-4 shrink-0">
            {agent.profile_photo_s3_url ? (
              <img
                src={agent.profile_photo_s3_url}
                alt={agent.full_name}
                className="w-24 h-24 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border border-border">
                <span className="text-[22px] font-semibold text-muted-foreground">
                  {agent.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}

            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
              <Badge
                variant={agent.is_verified ? "default" : "secondary"}
                className="text-[11px] gap-1.5"
              >
                {agent.is_verified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </>
                )}
              </Badge>

              <Badge
                variant={agent.status === "approved" ? "default" : "secondary"}
                className="text-[11px] capitalize"
              >
                {agent.status}
              </Badge>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-auto" />

          {/* Profile Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-[24px] font-semibold text-foreground mb-1">
                {agent.full_name}
              </h2>
              {agent.agency_name && (
                <p className="text-[14px] text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {agent.agency_name}
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow
                label="Email"
                value={agent.email}
                icon={<Mail className="w-4 h-4" />}
              />
              <InfoRow
                label="Mobile"
                value={agent.mobile_number}
                icon={<Phone className="w-4 h-4" />}
              />
              {agent.whatsapp_number && (
                <InfoRow
                  label="WhatsApp"
                  value={agent.whatsapp_number}
                  icon={<Phone className="w-4 h-4" />}
                />
              )}
              {(agent.city || agent.state) && (
                <InfoRow
                  label="Location"
                  value={[agent.city, agent.state].filter(Boolean).join(", ")}
                  icon={<MapPin className="w-4 h-4" />}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bio & Languages */}
      {(agent.bio || agent.languages_spoken) && (
        <Card className="p-6">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">
            About
          </h3>
          <div className="space-y-4">
            {agent.bio && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                  Bio
                </p>
                <p className="text-[13px] text-foreground leading-relaxed">
                  {agent.bio}
                </p>
              </div>
            )}
            {agent.languages_spoken && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                  Languages Spoken
                </p>
                <p className="text-[13px] text-foreground">
                  {agent.languages_spoken}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Domains Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[18px] font-semibold text-foreground">
              Your Domain
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              {domains.length} domain{domains.length !== 1 ? "s" : ""} assigned
              to your account
            </p>
          </div>
        </div>

        {domains.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-[14px] text-muted-foreground font-medium">
              No domains assigned yet
            </p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">
              Contact your administrator to get a domain assigned
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        )}
      </div>

      {/* Account Information */}
      <Card className="p-6 bg-muted/30 border-border/50">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
          <div>
            <span className="text-muted-foreground">Account Created</span>
            <p className="text-foreground font-medium mt-1">
              {new Date(agent.created_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated</span>
            <p className="text-foreground font-medium mt-1">
              {new Date(agent.updated_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Account Status</span>
            <p className="text-foreground font-medium mt-1 capitalize">
              {agent.status}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Invite Status</span>
            <p className="text-foreground font-medium mt-1 capitalize">
              {agent.invite_status}
            </p>
          </div>
        </div>

        {agent.kyc_document_s3_url && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[12px] text-muted-foreground">
                  KYC Document
                </p>
                <p className="text-[13px] text-foreground font-medium mt-0.5">
                  Document uploaded and available
                </p>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
