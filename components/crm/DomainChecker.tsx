"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { DomainAvailabilityResult } from "@/types";

/* ─────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────── */
function StatusBadge({ result }: { result: DomainAvailabilityResult }) {
  const isAvailable = result.available;
  const isFree      = isAvailable && result.is_wildcard_subdomain;

  const label = isAvailable
    ? isFree ? "Free" : "Available"
    : result.status === "active"  ? "Taken"
    : result.status === "pending" ? "Pending"
    : result.status === "expired" ? "Expired"
    : "Taken";

  const style = isAvailable
    ? isFree
      ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
    : result.status === "expired"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
      : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border leading-none shrink-0",
      style
    )}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   RESULT ROW
   ───────────────────────────────────────────── */
function ResultRow({
  result, onSelect, selected,
}: {
  result: DomainAvailabilityResult;
  onSelect: (r: DomainAvailabilityResult) => void;
  selected: boolean;
}) {
  const canSelect = result.available;

  return (
    <div
      onClick={() => canSelect && onSelect(result)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors",
        canSelect ? "cursor-pointer" : "cursor-default",
        selected ? "bg-accent" : canSelect ? "hover:bg-muted/60" : "opacity-55"
      )}
    >
      {/* Radio */}
      <div className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
        selected ? "bg-foreground border-foreground" : "border-muted-foreground/30"
      )}>
        {selected && <span className="text-background text-[8px] leading-none font-bold">✓</span>}
      </div>

      {/* Domain name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[14px] font-semibold text-foreground">{result.domain_name}</span>
          <span className="text-[14px] text-muted-foreground">{result.tld}</span>
          {result.is_wildcard_subdomain && (
            <span className="text-[10.5px] bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded font-medium">
              via {result.wildcard_base}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-muted-foreground mt-0.5">{result.full_domain}</div>
      </div>

      {/* Price */}
      {result.available && (
        <div className="text-right shrink-0 min-w-[52px]">
          <div className="text-[13.5px] font-semibold text-foreground">
            {result.price_usd === null ? "Free" : result.price_usd ? `${result.price_usd}` : "—"}
          </div>
          {result.price_usd !== null && result.price_usd && (
            <div className="text-[10.5px] text-muted-foreground">/yr</div>
          )}
        </div>
      )}

      <StatusBadge result={result} />
    </div>
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
   DOMAIN CHECKER
   ───────────────────────────────────────────── */
export default function DomainChecker({
  onSelect,
  selectedDomain,
}: {
  onSelect?: (result: DomainAvailabilityResult | null) => void;
  selectedDomain?: DomainAvailabilityResult | null;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<DomainAvailabilityResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<DomainAvailabilityResult | null>(selectedDomain ?? null);
  const [showTyping, setShowTyping] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const checkDomain = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]); setLoading(false); setShowTyping(false); return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/domains/check?q=${encodeURIComponent(q.trim())}`, {
        signal: abortRef.current.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check failed");
      setResults(json.data ?? []);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
      setShowTyping(false);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setShowTyping(false); setResults([]); setLoading(false); return;
    }
    setShowTyping(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkDomain(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, checkDomain]);

  const handleSelect = (result: DomainAvailabilityResult) => {
    const next = selected?.full_domain === result.full_domain ? null : result;
    setSelected(next);
    onSelect?.(next);
  };

  const clearAll = () => {
    setQuery(""); setResults([]); setSelected(null); onSelect?.(null);
  };

  // Quick-search: append .rexon.com to whatever is typed, or use as-is
  const handleRexonCheck = () => {
    const base = query.trim()
      .replace(/\.rexon\.(com|in)$/, "")
      .replace(/\.(com|in|co\.in|net|org|io)$/, "")
      || "yourdomain";
    setQuery(`${base}.rexon.com`);
  };

  return (
    <div className="space-y-3">

      {/* Search row: input + rexon.com quick button */}
      <div className="flex gap-2">
        <div className="relative flex-1 flex items-center border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring transition-all overflow-hidden">
          <SearchIcon className="w-4 h-4 text-muted-foreground ml-3.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkDomain(query)}
            placeholder="Type a name to check…"
            className="flex-1 bg-transparent border-none outline-none px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60"
          />
          {/* Spinner / typing indicator */}
          {(showTyping || loading) && (
            <div className="flex items-center gap-1.5 px-3 text-[12px] text-muted-foreground shrink-0">
              {loading && !showTyping
                ? <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
              }
              <span>checking…</span>
            </div>
          )}
          {query && (
            <button onClick={clearAll} className="px-3 text-muted-foreground hover:text-foreground text-lg leading-none transition-colors">
              ×
            </button>
          )}
        </div>

        {/* rexon.com quick-check pill */}
        <button
          type="button"
          onClick={handleRexonCheck}
          title="Check as *.rexon.com subdomain"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-muted hover:bg-accent text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
        >
          <span className="text-[10px] font-mono bg-background border border-border rounded px-1 py-0.5 text-foreground">*.</span>
          rexon.com
        </button>
      </div>

      {/* Hint chips */}
      {!query && (
        <div className="flex gap-2 flex-wrap">
          {["johndoe", "myagency", "bestprops", "realtypro"].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setQuery(hint)}
              className="text-[12px] px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[13px] text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
            <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">
              {results.length} options for &ldquo;{query}&rdquo;
            </span>
            <span className="text-[11.5px] font-semibold text-emerald-600 uppercase tracking-wide">
              {results.filter((r) => r.available).length} available
            </span>
          </div>
          {results.map((r, i) => (
            <ResultRow
              key={`${r.full_domain}-${i}`}
              result={r}
              onSelect={handleSelect}
              selected={selected?.full_domain === r.full_domain}
            />
          ))}
        </div>
      )}

      {/* Selected summary */}
      {selected && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <span className="text-emerald-600 text-base leading-none shrink-0">✓</span>
          <div className="flex-1 min-w-0">
            <span className="text-[13.5px] text-muted-foreground">Selected: </span>
            <span className="text-[13.5px] font-semibold text-foreground">{selected.full_domain}</span>
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); onSelect?.(null); }}
            className="text-muted-foreground hover:text-foreground text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}