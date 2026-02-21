import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/* ─────────────────────────────────────────────
   GET /api/domains/check?q=johndoe
   
   Checks availability of:
   - Custom TLDs: .com, .in, .co.in, .net, .org, .io
   - Free wildcard subdomains: *.rexon.com, *.rexon.in

   Returns array of DomainAvailabilityResult
   ─────────────────────────────────────────────  */

const CUSTOM_TLDS = ['.com', '.in', '.co.in', '.net', '.org', '.io'];
const WILDCARD_BASES = ['rexon.com', 'rexon.in'];

// Fictional pricing for custom TLDs (adjust to your registrar rates)
const TLD_PRICING: Record<string, number> = {
  '.com':   12.99,
  '.in':     7.99,
  '.co.in':  5.99,
  '.net':   11.99,
  '.org':   10.99,
  '.io':    39.99,
};

function extractBaseName(q: string): string {
  // Strip any TLD the user typed so we search just the label
  return q
    .replace(/^\*\./, '')              // strip wildcard prefix
    .replace(/\.rexon\.(com|in)$/, '') // strip our own bases
    .replace(/\.(com|in|co\.in|net|org|io)$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')         // keep only valid hostname chars
    .replace(/^-+|-+$/g, '');           // strip leading/trailing hyphens
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json(
      { success: false, error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  const base = extractBaseName(q);
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'Invalid domain name' },
      { status: 400 }
    );
  }

  try {
    // Gather all candidate full domains to check in one query
    const customCandidates  = CUSTOM_TLDS.map(tld => `${base}${tld}`);
    const wildcardCandidates = WILDCARD_BASES.map(wb => `${base}.${wb}`);
    const allCandidates     = [...customCandidates, ...wildcardCandidates];

    // Single query — check which domains are already registered/pending
    const taken = await query(
      `SELECT full_domain, status
       FROM agent_domains
       WHERE full_domain = ANY($1::text[])`,
      [allCandidates]
    );

    const takenMap = new Map<string, string>(
      taken.rows.map((r: any) => [r.full_domain, r.status])
    );

    // Also check our domains table for registered custom domains
    const registered = await query(
      `SELECT full_domain, status
       FROM domains
       WHERE full_domain = ANY($1::text[])`,
      [customCandidates]
    ).catch(() => ({ rows: [] })); // graceful if domains table doesnt exist yet

    const registeredMap = new Map<string, string>(
      registered.rows.map((r: any) => [r.full_domain, r.status])
    );

    const results = [];

    // Custom TLDs
    for (const tld of CUSTOM_TLDS) {
      const full = `${base}${tld}`;
      const takenStatus = takenMap.get(full) ?? registeredMap.get(full);

      results.push({
        domain_name:          base,
        tld,
        full_domain:          full,
        available:            !takenStatus,
        status:               takenStatus ?? 'available',
        is_wildcard_subdomain: false,
        wildcard_base:        null,
        price_usd:            takenStatus ? null : (TLD_PRICING[tld] ?? null),
      });
    }

    // Wildcard subdomains (free)
    for (const wb of WILDCARD_BASES) {
      const full = `${base}.${wb}`;
      const takenStatus = takenMap.get(full);

      results.push({
        domain_name:          base,
        tld:                  `.${wb}`,
        full_domain:          full,
        available:            !takenStatus,
        status:               takenStatus ?? 'available',
        is_wildcard_subdomain: true,
        wildcard_base:        wb,
        price_usd:            null, // always free
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