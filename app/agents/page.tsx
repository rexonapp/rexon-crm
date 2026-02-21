"use client";

import { useState } from "react";
import AgentsPage from "@/components/crm/AgentsPage";
import AgentFormDialog from "@/components/crm/AgentFormDialog";
import type { Agent } from "@/types";

export default function AgentsRoute() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddAgent = () => {
    setEditingAgentId(null);
    setDialogOpen(true);
  };

  const handleEditAgent = (agentId: string) => {
    setEditingAgentId(agentId);
    setDialogOpen(true);
  };

  const handleAgentSaved = (_agent: Agent) => {
    setRefreshTrigger((prev) => prev + 1);
    setDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingAgentId(null);
  };

  return (
    <div className="p-7 pb-12 max-w-[1400px]">

      {/* Page Header — matches DomainsRoute style */}
      <div className="mb-7">
        <h2 className="text-[22px] font-semibold text-foreground tracking-tight leading-none mb-1.5">
          Agents
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Manage your agents, assign roles and track performance.
        </p>
      </div>

      <AgentsPage
        onAddAgent={handleAddAgent}
        onEditAgent={handleEditAgent}
        refreshTrigger={refreshTrigger}
      />

      <AgentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        agentId={editingAgentId}
        onSuccess={handleAgentSaved}
      />
    </div>
  );
}