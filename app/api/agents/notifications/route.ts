import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth'; 

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const agentId = session?.agentId;
    if (!agentId) return NextResponse.json({ success: false }, { status: 401 });

    const result = await query(`
      SELECT id, type, title, message, reference_id, reference_table, is_read, created_at
      FROM agent_notifications
      WHERE agent_id = $1
      ORDER BY is_read ASC, created_at DESC
      LIMIT 50
    `, [agentId]);

    return NextResponse.json({ success: true, notifications: result.rows });
  } catch (error) {
    console.error('[agent notifications] GET error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}