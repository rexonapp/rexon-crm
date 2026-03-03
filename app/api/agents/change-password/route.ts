import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/lib/auth';

/**
 * Change Password API Route
 * POST /api/agents/change-password
 *
 * Allows agent to change from temporary password to permanent password.
 * Accepts a JWT via httpOnly cookie or Authorization Bearer header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session (cookie or Bearer token)
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Missing or invalid token' },
        { status: 401 }
      );
    }

    const { agentId, currentPassword, newPassword } = await request.json();

    // Validate input
    if (!agentId || !currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent ID, current password, and new password are required',
        },
        { status: 400 }
      );
    }

    // Verify agentId matches token
    if (session.agentId !== agentId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Agent ID mismatch' },
        { status: 401 }
      );
    }

    // Validate new password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 8 characters and contain uppercase letter, lowercase letter, number, and special character',
        },
        { status: 400 }
      );
    }

    // Prevent same password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password must be different from current password',
        },
        { status: 400 }
      );
    }

    // Get agent from database
    const agentResult = await query(
      `SELECT
        id,
        email,
        full_name,
        password_salt,
        password_hash,
        is_temporary_password
      FROM agents
      WHERE id = $1`,
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
        },
        { status: 404 }
      );
    }

    const agent = agentResult.rows[0];

    // Verify current password
    let currentPasswordMatches = false;

    // Check temporary password (password_salt)
    if (agent.is_temporary_password && agent.password_salt) {
      if (currentPassword === agent.password_salt) {
        currentPasswordMatches = true;
      }
    }

    // Check main password (password_hash)
    if (!currentPasswordMatches && agent.password_hash) {
      try {
        currentPasswordMatches = await bcrypt.compare(
          currentPassword,
          agent.password_hash
        );
      } catch (err) {
        console.error('[Bcrypt Compare Error]', {
          error: err instanceof Error ? err.message : 'Unknown error',
          agentId,
          timestamp: new Date().toISOString(),
        });
        currentPasswordMatches = false;
      }
    }

    if (!currentPasswordMatches) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password is incorrect',
        },
        { status: 401 }
      );
    }

    // Hash new password
    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    } catch (err) {
      console.error('[Bcrypt Hash Error]', {
        error: err instanceof Error ? err.message : 'Unknown error',
        agentId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to hash password',
        },
        { status: 500 }
      );
    }

    // Update agent password in database
    const updateResult = await query(
      `UPDATE agents
      SET
        password_hash = $1,
        password_salt = NULL,
        is_temporary_password = false,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        email,
        full_name,
        is_temporary_password`,
      [hashedPassword, agentId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update password',
        },
        { status: 500 }
      );
    }

    const updatedAgent = updateResult.rows[0];

    // Log the password change
    console.log('[Agent Password Changed]', {
      agentId: agent.id,
      email: agent.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password changed successfully',
        agent: {
          id: updatedAgent.id,
          email: updatedAgent.email,
          full_name: updatedAgent.full_name,
          is_temporary_password: updatedAgent.is_temporary_password,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Agent Change Password API Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while changing password',
      },
      { status: 500 }
    );
  }
}