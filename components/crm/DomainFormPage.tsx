"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import DomainChecker from "@/components/crm/DomainChecker";
import type { Agent, DomainAvailabilityResult, DomainFormData } from "@/types";

const EMPTY: DomainFormData = {
  agent_id:          "",
  domain_name:       "",
  tld:               ".com",
  domain_type:       "custom",
  is_wildcard:       false,
  wildcard_base:     "",
  subdomain_prefix:  "",
  price_usd:         "",
  renewal_price_usd: "",
  auto_renew:        true,
  notes:             "",
};

const DOMAIN_TYPES = [
  { type: ".com ", desc: "Custom TLDs — registered independently" },
  { type: "*.rexon.com",         desc: "Free subdomains under platform wildcard" },
  { type: ".net / .org / .io",   desc: "Other standard TLDs"                     },
];

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 6.5h.01" />
    </svg>
  );
}

export default function DomainFormPage() {
  const [form, setForm]               = useState<DomainFormData>(EMPTY);
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainAvailabilityResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((json) => { if (json.success) setAgents(json.data); })
      .catch(() => {});
  }, []);

  const handleDomainSelect = (result: DomainAvailabilityResult | null) => {
    setSelectedDomain(result);
    if (result) {
      setForm((f) => ({
        ...f,
        domain_name:      result.domain_name,
        tld:              result.tld,
        domain_type:      result.is_wildcard_subdomain ? "subdomain" : "custom",
        wildcard_base:    result.wildcard_base ?? "",
        subdomain_prefix: result.is_wildcard_subdomain ? result.domain_name : "",
        is_wildcard:      result.is_wildcard_subdomain,
        // Pre-fill price if the checker returned one
        price_usd:        result.price_usd !== null && result.price_usd !== undefined
                            ? String(result.price_usd)
                            : "",
      }));
    }
  };

  const set = (key: keyof DomainFormData) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain_name || !form.tld) {
      setError("Please search and select a domain first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...form,
        // FIX: agent_id is a UUID string — do NOT parseInt it
        agent_id:          form.agent_id || null,
        price_usd:         form.price_usd         ? parseFloat(form.price_usd)         : null,
        renewal_price_usd: form.renewal_price_usd  ? parseFloat(form.renewal_price_usd) : null,
        // Derived full_domain for convenience
        full_domain: selectedDomain?.full_domain,
      };

      // POST to /api/agent-domains (creates a domain request assigned to agent)
      const res  = await fetch("/api/agent-domains", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Registration failed");

      setSuccess(json.message ?? "Domain registered successfully!");
      setForm(EMPTY);
      setSelectedDomain(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-7 items-start">

        {/* ── Left: Domain Checker ─────────── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight mb-1">
              Check Availability
            </h3>
            <p className="text-[13.5px] text-muted-foreground mb-5">
              Type a name below — we will check .com and free rexon.com subdomains.
              Use the <span className="font-semibold text-foreground">*.rexon.com</span> button to check subdomains instantly.
            </p>
            <DomainChecker onSelect={handleDomainSelect} selectedDomain={selectedDomain} />
          </div>

          {/* Supported types */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-[13px] font-semibold text-foreground">Supported Domain Types</span>
            </div>
            <div className="divide-y divide-border">
              {DOMAIN_TYPES.map((item) => (
                <div key={item.type} className="flex items-start gap-3 py-2.5">
                  <code className="text-[11.5px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded border border-border shrink-0 mt-0.5 font-mono">
                    {item.type}
                  </code>
                  <span className="text-[12.5px] text-muted-foreground leading-snug">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Registration Details ──── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight mb-1">
            Registration Details
          </h3>
          <p className="text-[13.5px] text-muted-foreground mb-6">
            Assign the domain and configure settings
          </p>

          <div className="space-y-5">

            {/* Selected domain preview */}
            {selectedDomain ? (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <span className="text-emerald-600 text-[16px] leading-none mt-0.5 shrink-0">✓</span>
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{selectedDomain.full_domain}</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5">
                    {selectedDomain.is_wildcard_subdomain ? "Free wildcard subdomain" : "Custom domain"}
                    {" · "}
                    {selectedDomain.price_usd === null ? "Free" : selectedDomain.price_usd ? `$${selectedDomain.price_usd}/yr` : "Pricing TBD"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-[13.5px] text-amber-700 dark:text-amber-400">
                <span className="text-[15px] shrink-0">←</span>
                Search and select a domain on the left first
              </div>
            )}

            <Separator />

            {/* Assign to agent */}
            <div className="space-y-1.5">
              <Label className="text-[13.5px] font-medium">Assign to Agent</Label>
              <Select
                value={form.agent_id}
                onValueChange={(v) => set("agent_id")(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-10 text-[13.5px]">
                  <SelectValue placeholder="No agent (unassigned)" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  <SelectItem value="__none__" className="text-[13.5px] text-muted-foreground">
                    No agent (unassigned)
                  </SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-[13.5px]">
                      {a.full_name}{a.agency_name ? ` · ${a.agency_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13.5px] font-medium">Price (USD/yr)</Label>
                <Input
                  value={form.price_usd}
                  onChange={(e) => set("price_usd")(e.target.value)}
                  placeholder="e.g. 12.99"
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 text-[13.5px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13.5px] font-medium">Renewal (USD/yr)</Label>
                <Input
                  value={form.renewal_price_usd}
                  onChange={(e) => set("renewal_price_usd")(e.target.value)}
                  placeholder="e.g. 14.99"
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 text-[13.5px]"
                />
              </div>
            </div>

            {/* Auto-renew */}
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
              <div>
                <p className="text-[13.5px] font-medium text-foreground">Auto-renew</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Automatically renew before expiry</p>
              </div>
              <Switch
                checked={form.auto_renew}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, auto_renew: checked }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[13.5px] font-medium">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Any notes about this domain registration…"
                rows={3}
                className="text-[13.5px] resize-y"
              />
            </div>

            {/* Feedback */}
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-[13.5px] text-destructive">
                <span className="shrink-0 mt-0.5 text-base leading-none">✕</span>
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[13.5px] text-emerald-700 dark:text-emerald-400">
                <span className="shrink-0 mt-0.5 text-base leading-none">✓</span>
                {success}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || !selectedDomain}
              className="w-full h-10 text-[14px] font-medium"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              )}
              Register Domain
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}