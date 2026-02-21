import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/* ─────────────────────────────────────────────
   GET /api/domains/check?q=johndoe
   
   Checks availability across:
   - Custom TLDs:  .com  .in  .co.in  .net  .org  .io
   - Free wildcard subdomains: *.rexon.com  *.rexon.in

   Looks up both `agent_domains` (domain requests)
   and `domains` (registered domains) tables to determine
   if each option is already taken.

   Returns: DomainAvailabilityResult[]
   ─────────────────────────────────────────────  */

const CUSTOM_TLDS: string[] = ['.com'];
const WILDCARD_BASES: string[] = ['rexon.com', 'rexon.in'];

// Approximate registration prices per TLD (USD/yr)
const TLD_PRICING: Record<string, number> = {
  '.com':   2000,
};

/**
 * Strips any TLD or wildcard prefix the user may have typed
 * so we always work with just the base label (e.g. "johndoe").
 */
function extractBase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\*\./, '')                         // strip wildcard  *.
    .replace(/\.rexon\.(com|in)$/i, '')           // strip .rexon.com / .rexon.in
    .replace(/[^a-z0-9-]/g, '')                     // only valid hostname chars
    .replace(/^-+|-+$/g, '');                        // no leading/trailing hyphens
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json(
      { success: false, error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  const base = extractBase(q);
  if (!base || base.length < 2) {
    return NextResponse.json(
      { success: false, error: 'Could not parse a valid domain name from your input' },
      { status: 400 }
    );
  }

  try {
    // Build the full list of candidates to check in one shot
    const customCandidates   = CUSTOM_TLDS.map(tld => `${base}${tld}`);
    const wildcardCandidates = WILDCARD_BASES.map(wb => `${base}.${wb}`);
    const allCandidates      = [...customCandidates, ...wildcardCandidates];

    // ── Query agent_domains table ───────────────
    const agentDomainRows = await query(
      `SELECT full_domain, status
       FROM   agent_domains
       WHERE  full_domain = ANY($1::text[])`,
      [allCandidates]
    );
    const agentDomainMap = new Map<string, string>(
      agentDomainRows.rows.map((r: any) => [r.full_domain, r.status as string])
    );

    // ── Query domains table (may not exist yet — catch gracefully) ──
    let registeredMap = new Map<string, string>();
    try {
      const domainRows = await query(
        `SELECT full_domain, status
         FROM   domains
         WHERE  full_domain = ANY($1::text[])`,
        [customCandidates]
      );
      registeredMap = new Map<string, string>(
        domainRows.rows.map((r: any) => [r.full_domain, r.status as string])
      );
    } catch {
      // domains table might not exist yet — skip silently
    }

    const results = [];

    // ── Custom TLD results ──────────────────────
    for (const tld of CUSTOM_TLDS) {
      const full       = `${base}${tld}`;
      const takenStatus = agentDomainMap.get(full) ?? registeredMap.get(full);
      const available  = !takenStatus || takenStatus === 'released';

      results.push({
        domain_name:           base,
        tld,
        full_domain:           full,
        available,
        status:                takenStatus ?? 'available',
        is_wildcard_subdomain: false,
        wildcard_base:         null,
        price_usd:             available ? (TLD_PRICING[tld] ?? null) : null,
      });
    }

    // ── Wildcard subdomain results ───────────────
    for (const wb of WILDCARD_BASES) {
      const full       = `${base}.${wb}`;
      const takenStatus = agentDomainMap.get(full);
      const available  = !takenStatus || takenStatus === 'released';

      results.push({
        domain_name:           base,
        tld:                   `.${wb}`,
        full_domain:           full,
        available,
        status:                takenStatus ?? 'available',
        is_wildcard_subdomain: true,
        wildcard_base:         wb,
        price_usd:             null,   // always free
      });
    }

    return NextResponse.json({ success: true, data: results });

  } catch (error: any) {
    console.error('[GET /api/domains/check]', error);
    return NextResponse.json(
      { success: false, error: 'Domain check failed', detail: error.message },
      { status: 500 }
    );
  }
}