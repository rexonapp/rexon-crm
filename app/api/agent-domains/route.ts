import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/* ─────────────────────────────────────────────
   GET /api/agent-domains
   ─────────────────────────────────────────────  */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status  = searchParams.get("status");
  const agentId = searchParams.get("agent_id");
  const page    = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit   = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset  = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: any[]        = [];
    let   idx                  = 1;

    if (status)  { conditions.push(`ad.status = $${idx++}`);   params.push(status); }
    if (agentId) { conditions.push(`ad.agent_id = $${idx++}`); params.push(agentId); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows, countRow] = await Promise.all([
      query(
        `SELECT ad.*, a.full_name AS agent_name, a.email AS agent_email,
                a.agency_name AS agent_agency, a.mobile_number AS agent_phone
         FROM agent_domains ad
         LEFT JOIN agents a ON a.id = ad.agent_id
         ${where}
         ORDER BY ad.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) AS total FROM agent_domains ad ${where}`,
        params
      ),
    ]);

    return NextResponse.json({
      success: true,
      data:    rows.rows,
      total:   parseInt(countRow.rows[0]?.total ?? "0", 10),
      page,
      limit,
    });
  } catch (error: any) {
    console.error("[GET /api/agent-domains]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent domains", detail: error.message },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────
   POST /api/agent-domains
   ─────────────────────────────────────────────  */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, domain_name, full_domain } = body;

    if (!full_domain && !domain_name) {
      return NextResponse.json(
        { success: false, error: "full_domain or domain_name is required" },
        { status: 400 }
      );
    }

    const resolvedFullDomain = full_domain ?? domain_name;

    // Check if domain already exists and is active/pending
    const existing = await query(
      `SELECT id, status FROM agent_domains WHERE full_domain = $1`,
      [resolvedFullDomain]
    );
    if (existing.rowCount) {
      const st = existing.rows[0].status;
      if (st === "active" || st === "pending") {
        return NextResponse.json(
          { success: false, error: `Domain "${resolvedFullDomain}" is already ${st}` },
          { status: 409 }
        );
      }
    }

    const result = await query(
      `INSERT INTO agent_domains (
        agent_id, domain_name, full_domain,
        status, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        'pending', false, NOW(), NOW()
      ) RETURNING *`,
      [
        agent_id || null,
        domain_name || resolvedFullDomain,
        resolvedFullDomain,
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: "Domain registered successfully! Status: pending approval." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/agent-domains]", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "This domain is already registered" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to register domain", detail: error.message },
      { status: 500 }
    );
  }
}