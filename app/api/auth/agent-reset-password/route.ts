// app/api/auth/agent-reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const secret = new TextEncoder().encode(process.env.AGENT_RESET_TOKEN_SECRET!);

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required.' },
        { status: 400 }
      );
    }

    // Validate password strength — same rules as change-password route
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
        },
        { status: 400 }
      );
    }

    // Verify and decode the JWT
    let payload: { sub?: string; email?: string };
    try {
      const result = await jwtVerify(token, secret, { requiredClaims: ['sub', 'exp'] });
      payload = result.payload as { sub?: string; email?: string };
    } catch {
      return NextResponse.json(
        { error: 'Reset link is invalid or has expired.' },
        { status: 401 }
      );
    }

    const agentId = payload.sub;
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
    }

    // Confirm agent still exists and is approved
    const agentResult = await query(
      `SELECT id, email, full_name, status FROM agents WHERE id = $1 LIMIT 1`,
      [agentId]
    );

    if (!agentResult.rows[0]) {
      return NextResponse.json(
        { error: 'Agent account not found.' },
        { status: 404 }
      );
    }

    const agent = agentResult.rows[0];

    if (agent.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password — also clears temp password fields and marks is_temporary_password false
    // updated_at tracks when the password was last changed
    await query(
      `UPDATE agents
       SET
         password_hash         = $1,
         password_salt         = NULL,
         is_temporary_password = false,
         updated_at            = NOW()
       WHERE id = $2`,
      [hashedPassword, agentId]
    );

    console.log('[Agent Password Reset via Email]', {
      agentId: agent.id,
      email: agent.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[Agent Reset-password Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}