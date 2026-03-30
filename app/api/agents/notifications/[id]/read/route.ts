import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const {id}= await params;
  try {
    const session = await getSession();
    const agentId = session?.agentId;
    if (!agentId) return NextResponse.json({ success: false }, { status: 401 });

    await query(`
      UPDATE agent_notifications
      SET is_read = TRUE
      WHERE id = $1 AND agent_id = $2
    `, [id, agentId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}