import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string } >}
) {
    const {id} = await params;
  try {
    const session = await getSession();
    const agentId = session?.agentId;
    if (!agentId) return NextResponse.json({ success: false }, { status: 401 });

    await query(`
      DELETE FROM agent_notifications
      WHERE id = $1 AND agent_id = $2
    `, [id, agentId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}