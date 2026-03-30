// lib/getAutoApprovalFlags.ts


import { query } from '@/lib/db';

export interface AutoApprovalFlags {
  autoApproveListings: boolean;
  autoApproveAgents: boolean;
}

export async function getAutoApprovalFlags(): Promise<AutoApprovalFlags> {
  const result = await query(
    `SELECT auto_approve_listings, auto_approve_agents
     FROM superadmin_settings WHERE id = 1`,
    [],
  );
  const row = result.rows[0];
  return {
    autoApproveListings: row?.auto_approve_listings ?? false,
    autoApproveAgents:   row?.auto_approve_agents   ?? false,
  };
}