"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */
interface AgentDomain {
  id: string;
  agent_id: string;
  domain_name: string;
  full_domain: string;
  status: "pending" | "active" | "released";
  is_active: boolean;
  checked_at: string | null;
  activated_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  agent_name: string;
  agent_email: string;
  agent_agency: string | null;
  agent_phone: string | null;
}

type StatusFilter = "all" | "pending" | "active" | "released";

/* ─────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: AgentDomain["status"] }) {
  const styles: Record<AgentDomain["status"], string> = {
    pending:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    released: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  };
  const labels: Record<AgentDomain["status"], string> = {
    pending: "Pending", active: "Active", released: "Released",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border leading-none",
      styles[status]
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "active" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : "bg-zinc-400"
      )} />
      {labels[status]}
    </span>
  );
}

/* ─────────────────────────────────────────────
   FORMAT DATE
   ───────────────────────────────────────────── */
function fmtDate(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground/40">—</span>;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ─────────────────────────────────────────────
   CONFIRM DIALOG
   ───────────────────────────────────────────── */
function ConfirmDialog({
  open, action, domain, onConfirm, onCancel, loading,
}: {
  open: boolean;
  action: "activate" | "release" | null;
  domain: AgentDomain | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!action || !domain) return null;
  const isActivate = action === "activate";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">
            {isActivate ? "Activate Domain" : "Release Domain"}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            {isActivate
              ? `Mark "${domain.full_domain}" as active and assign it to ${domain.agent_name}.`
              : `Release "${domain.full_domain}" — ${domain.agent_name} will lose access.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 divide-y divide-border overflow-hidden text-[13.5px]">
          {[
            { label: "Domain",  value: domain.full_domain },
            { label: "Agent",   value: domain.agent_name },
            { label: "Status",  value: <StatusBadge status={domain.status} /> },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 mt-1">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="text-[13.5px]">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "min-w-[110px] text-[13.5px]",
              isActivate
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700"
            )}
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            )}
            {isActivate ? "Activate" : "Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   REFRESH ICON
   ───────────────────────────────────────────── */
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10A6.5 6.5 0 0 1 16 7.5M16.5 10A6.5 6.5 0 0 1 4 12.5" />
      <path d="M16 4.5v3h-3M4 15.5v-3H7" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function AgentDomainsManager() {
  const [domains, setDomains]             = useState<AgentDomain[]>([]);
  const [total, setTotal]                 = useState(0);
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmAction, setConfirmAction] = useState<"activate" | "release" | null>(null);
  const [confirmDomain, setConfirmDomain] = useState<AgentDomain | null>(null);

  /* ── Fetch ─────────────────────────────── */
  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "100");
      const res  = await fetch(`/api/agent-domains?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDomains(json.data);
      setTotal(json.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openConfirm = (domain: AgentDomain, action: "activate" | "release") => {
    setConfirmDomain(domain); setConfirmAction(action); setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmDomain || !confirmAction) return;
    setActionLoading(true);
    const statusMap = { activate: "active", release: "released" } as const;
    try {
      const res  = await fetch(`/api/agent-domains/${confirmDomain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusMap[confirmAction] }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast({ message: json.message ?? "Domain updated", type: "success" });
      setConfirmOpen(false);
      fetchDomains();
    } catch (e: any) {
      setToast({ message: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Filter counts ─────────────────────── */
  const counts = {
    all:      total,
    pending:  domains.filter((d) => d.status === "pending").length,
    active:   domains.filter((d) => d.status === "active").length,
    released: domains.filter((d) => d.status === "released").length,
  };

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "all",      label: "All" },
    { id: "pending",  label: "Pending" },
    { id: "active",   label: "Active" },
    { id: "released", label: "Released" },
  ];

  /* ── Render ─────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Toast ───────────────────────────── */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13.5px] font-medium shadow-lg border",
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
        )}>
          <span className="text-base leading-none">{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
                statusFilter === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span className={cn(
                "text-[11px] font-semibold tabular-nums",
                statusFilter === id ? "text-foreground/60" : "text-muted-foreground/50"
              )}>
                {counts[id]}
              </span>
            </button>
          ))}
        </div>

        {/* Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDomains}
          disabled={loading}
          className="gap-1.5 text-[13px]"
        >
          <RefreshIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Error ───────────────────────────── */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-[13.5px] text-destructive">
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────── */}
      {/*
        TABLE CSS FIX:
        The "lines" artifact you see is caused by border-collapse on the <table>
        conflicting with border-radius on the wrapper. The fix is:
        1. Remove any border-collapse from globals / component styles
        2. Let shadcn's Table component handle it — it uses border-separate by default
        3. Wrap in a div with overflow-hidden + rounded-xl + border (not on the table itself)
      */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11 pl-5">Domain</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11">Agent</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11">Status</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11">Requested</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11">Activated</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11">Released</TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide h-11 text-right pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j} className={j === 0 ? "pl-5" : j === 6 ? "pr-5" : ""}>
                      <div className={cn(
                        "h-4 bg-muted animate-pulse rounded-md",
                        j === 0 ? "w-36" : j === 1 ? "w-28" : j === 2 ? "w-20" : "w-20"
                      )} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : domains.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-16 text-[14px] text-muted-foreground">
                  No domain requests found
                  {statusFilter !== "all" && (
                    <span className="ml-1 text-muted-foreground/60">with status "{statusFilter}"</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              domains.map((d) => (
                <TableRow key={d.id} className="group">
                  <TableCell className="pl-5 py-3.5">
                    <div className="text-[14px] font-semibold text-foreground">{d.full_domain}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{d.domain_name}</div>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <div className="text-[13.5px] font-medium text-foreground">{d.agent_name}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5 truncate max-w-[180px]">
                      {d.agent_agency ?? d.agent_email}
                    </div>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <StatusBadge status={d.status} />
                  </TableCell>

                  <TableCell className="text-[13px] text-muted-foreground py-3.5">{fmtDate(d.created_at)}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground py-3.5">{fmtDate(d.activated_at)}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground py-3.5">{fmtDate(d.released_at)}</TableCell>

                  <TableCell className="pr-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(d.status === "pending" || d.status === "released") && (
                        <Button
                          size="sm"
                          onClick={() => openConfirm(d, "activate")}
                          className="h-8 px-3.5 text-[12.5px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Activate
                        </Button>
                      )}
                      {(d.status === "pending" || d.status === "active") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirm(d, "release")}
                          className="h-8 px-3.5 text-[12.5px] text-muted-foreground hover:text-foreground"
                        >
                          Release
                        </Button>
                      )}
                      {d.status === "released" && !d.is_active && (
                        <span className="text-[13px] text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        {!loading && domains.length > 0 && (
          <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{domains.length}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> records
            </span>
            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filter ×
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        action={confirmAction}
        domain={confirmDomain}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={actionLoading}
      />
    </div>
  );
}