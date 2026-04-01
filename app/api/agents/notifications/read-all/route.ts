import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    const agentId = session?.agentId;
    if (!agentId) return NextResponse.json({ success: false }, { status: 401 });

    await query(`
      UPDATE agent_notifications
      SET is_read = TRUE
      WHERE agent_id = $1 AND is_read = FALSE
    `, [agentId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}