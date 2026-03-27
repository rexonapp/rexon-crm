// app/api/agents/[id]/dashboard-settings/route.ts


import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string } >}
) {
  try {
    const { id: agentId } = await params;

    const result = await query(
      "SELECT settings FROM agent_dashboard_settings WHERE agent_id = $1",
      [agentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, settings: null });
    }

    return NextResponse.json({ success: true, settings: result.rows[0].settings });
  } catch (error) {
    console.error("GET dashboard settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard settings" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const body = await request.json();

    // Whitelist the keys we allow to be stored
    const allowed = [
      "hero_background_url",
      "hero_background_color",
      "hero_title",
      "hero_subtitle",
      "footer_text",
      "footer_links",
      "footer_show_contact",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) sanitized[key] = body[key];
    }

    await query(
      `INSERT INTO agent_dashboard_settings (agent_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (agent_id)
       DO UPDATE SET settings = $2, updated_at = NOW()`,
      [agentId, JSON.stringify(sanitized)]
    );

    return NextResponse.json({ success: true, settings: sanitized });
  } catch (error) {
    console.error("PUT dashboard settings error:", error);
    return NextResponse.json(
      { error: "Failed to save dashboard settings" },
      { status: 500 }
    );
  }
}