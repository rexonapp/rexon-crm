"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

/* ─────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  pending:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  suspended: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  rejected:  "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500", pending: "bg-amber-500",
  suspended: "bg-red-500",  rejected: "bg-zinc-400",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const dot   = STATUS_DOT[status]   ?? STATUS_DOT.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border leading-none",
      style
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5l3.5 3.5" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   AGENT ROW
   Edit button is always visible (not hover-only)
   ───────────────────────────────────────────── */
function AgentRow({ agent, onEdit }: { agent: Agent; onEdit: (id: string) => void }) {
  const initials = agent.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">

      {/* Agent */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold shrink-0 text-foreground">
            {agent.profile_photo_s3_url ? (
              <img src={agent.profile_photo_s3_url} alt={initials} className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-foreground leading-tight">{agent.full_name}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{agent.email}</div>
          </div>
        </div>
      </td>

      {/* Agency */}
      <td className="px-5 py-3.5">
        <div className="text-[13.5px] text-foreground">{agent.agency_name ?? <span className="text-muted-foreground/40">—</span>}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{agent.city ?? ""}</div>
      </td>

      {/* Specialization */}
      <td className="px-5 py-3.5">
        <div className="text-[13px] text-muted-foreground">
          {agent.specialization
            ? agent.specialization.replace(/_/g, " ").replace(/\w/g, (c: string) => c.toUpperCase())
            : <span className="text-muted-foreground/40">—</span>}
        </div>
      </td>

      {/* Experience */}
      <td className="px-5 py-3.5 text-center">
        <span className="text-[13.5px] text-foreground font-medium">{agent.experience_years ?? 0}y</span>
      </td>

      {/* Verified */}
      <td className="px-5 py-3.5 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border",
              agent.is_verified
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                : "bg-muted border-border text-muted-foreground"
            )}>
              {agent.is_verified ? "✓" : "·"}
            </span>
          </TooltipTrigger>
          <TooltipContent><p>{agent.is_verified ? "KYC Verified" : "Not Verified"}</p></TooltipContent>
        </Tooltip>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <StatusBadge status={agent.status ?? "pending"} />
      </td>

      {/* Actions — always visible, no opacity trick */}
      <td className="px-5 py-3.5 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(String(agent.id))}
          className="h-8 px-3.5 text-[12.5px] font-medium"
        >
          Edit
        </Button>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────
   AGENTS PAGE
   ───────────────────────────────────────────── */
const COLS = [
  { label: "Agent",          align: "left"   },
  { label: "Agency",         align: "left"   },
  { label: "Specialization", align: "left"   },
  { label: "Exp.",           align: "center" },
  { label: "Verified",       align: "center" },
  { label: "Status",         align: "left"   },
  { label: "",               align: "right"  },
];

export default function AgentsPage({
  onAddAgent,
  onEditAgent,
  refreshTrigger,
}: {
  onAddAgent?: () => void;
  onEditAgent?: (id: string) => void;
  refreshTrigger?: number;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchAgents = useCallback(() => {
    setLoading(true);
    fetch("/api/agents")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error);
        setAgents(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents, refreshTrigger]);

  const filtered = agents.filter((a) =>
    [a.full_name, a.email, a.agency_name ?? "", a.city ?? ""]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="anim-up space-y-5">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, agency…"
              className="pl-10 h-9 text-[13.5px]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          <span className="text-[13px] text-muted-foreground tabular-nums">
            {filtered.length} agent{filtered.length !== 1 ? "s" : ""}
          </span>

          {onAddAgent && (
            <Button onClick={onAddAgent} className="ml-auto h-9 px-4 text-[13.5px]">
              + Add Agent
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
              <span className="text-[13.5px]">Loading agents…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-2xl">⚠</span>
              <div className="text-[14px] font-semibold text-foreground">Failed to load agents</div>
              <div className="text-[13px] text-muted-foreground">{error}</div>
              <Button variant="outline" size="sm" onClick={fetchAgents} className="mt-1">
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-2xl text-muted-foreground/40">◉</span>
              <div className="text-[14px] font-semibold text-foreground">
                {search ? "No agents match your search" : "No agents yet"}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {search ? "Try a different keyword" : "Click 'Add Agent' to get started"}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {COLS.map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        "h-11 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
                        i === 0 ? "pl-5 pr-4 text-left" : i === COLS.length - 1 ? "pl-4 pr-5 text-right" : "px-5",
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    onEdit={(id) => onEditAgent?.(id)}
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t bg-muted/30 text-[12.5px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{agents.length}</span> agents
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}