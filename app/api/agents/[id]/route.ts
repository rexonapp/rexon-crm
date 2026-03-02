import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * GET /api/agents/[id]
 * Returns agent profile + assigned domains from agents_domain table.
 * Requires a valid JWT where agentId matches the requested id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Missing token' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { id: agentId } = await params;

    // Agent can only access their own profile
    if (decoded.agentId !== agentId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch agent profile
    const agentResult = await query(
      `SELECT
        id,
        email,
        full_name,
        mobile_number,
        whatsapp_number,
        city,
        state,
        address,
        pincode,
        agency_name,
        bio,
        languages_spoken,
        profile_photo_s3_url,
        kyc_document_s3_url,
        is_verified,
        status,
        invite_status,
        terms_accepted,
        created_at,
        updated_at
      FROM agents
      WHERE id = $1`,
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Fetch agent domains
    const domainsResult = await query(
      `SELECT
        id,
        domain_name,
        full_domain,
        status,
        is_active,
        checked_at,
        activated_at,
        created_at
      FROM agent_domains
      WHERE agent_id = $1
      ORDER BY created_at DESC`,
      [agentId]
    );

    return NextResponse.json({
      success: true,
      agent: agentResult.rows[0],
      domains: domainsResult.rows,
    });
  } catch (error) {
    console.error('[Agent Profile API Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
