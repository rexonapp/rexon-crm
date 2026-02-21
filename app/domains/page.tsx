"use client";

import { useState } from "react";
import DomainFormPage from "@/components/crm/DomainFormPage";
import AgentDomainsManager from "@/components/crm/AgentDomainManager";
import { cn } from "@/lib/utils";

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10l8 4 8-4M2 14l8 4 8-4M10 2L2 6l8 4 8-4-8-4z" />
    </svg>
  );
}
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  );
}

const TABS = [
  { id: "requests", label: "Domain Requests", icon: LayersIcon },
  { id: "register", label: "Register Domain",  icon: PlusCircleIcon },
] as const;

type TabId = typeof TABS[number]["id"];

export default function DomainsRoute() {
  const [activeTab, setActiveTab] = useState<TabId>("requests");

  return (
    <div className="p-7 pb-12 max-w-[1400px]">

      {/* ── Page Header ───────────────────────── */}
      <div className="mb-7">
        <h2 className="text-[22px] font-semibold text-foreground tracking-tight leading-none mb-1.5">
          Domains
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Manage agent domain requests and register new domains.
        </p>
      </div>

      {/* ── Tab Bar ───────────────────────────── */}
      <div className="flex items-center gap-0.5 mb-7 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────── */}
      {activeTab === "requests" && <AgentDomainsManager />}
      {activeTab === "register" && <DomainFormPage />}
    </div>
  );
}