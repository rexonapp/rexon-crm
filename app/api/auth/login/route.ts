//api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * agents Login API Route
 * POST /api/auth/agents-login
 * 
 * Authenticates agents using email and password
 * Supports both temporary password (password_salt) and main password (password_hash)
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Query agents by email
    const agentsResult = await query(
      `SELECT 
        id,
        email,
        full_name,
        password_salt,
        password_hash,
        is_temporary_password,
        is_verified,
        status,
        invite_status,
        profile_photo_s3_url,
        agency_name,
        whatsapp_number
      FROM agents
      WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    // Check if agents exists
    if (agentsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    const agents = agentsResult.rows[0];

    // Check agents status
    if (agents.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is inactive. Please contact your administrator.',
        },
        { status: 401 }
      );
    }

    // // Check invite status
    // if (agents.invite_status !== 'accepted') {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Your account invite is pending. Please check your email to accept the invite.',
    //     },
    //     { status: 401 }
    //   );
    // }

    // Verify password
    let passwordMatches = false;

    // 1. Check temporary password (password_salt)
    if (agents.is_temporary_password && agents.password_salt) {
      if (password === agents.password_salt) {
        passwordMatches = true;
      }
    }

    // 2. Check main password (password_hash)
    if (!passwordMatches && agents.password_hash) {
      try {
        passwordMatches = await bcrypt.compare(password, agents.password_hash);
      } catch (err) {
        console.error('[Bcrypt Compare Error]', {
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        passwordMatches = false;
      }
    }

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        agentId: agents.id,
        email: agents.email,
        type: 'agents',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login timestamp
    try {
      await query(
        `UPDATE agents
        SET updated_at = NOW()
        WHERE id = $1`,
        [agents.id]
      );
    } catch (err) {
      console.error('[Update Last Login Error]', {
        error: err instanceof Error ? err.message : 'Unknown error',
        agentsId: agents.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful login
    console.log('[agents Login Success]', {
      agentsId: agents.id,
      email: agents.email,
      timestamp: new Date().toISOString(),
    });

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        agent: {
          id: agents.id,
          email: agents.email,
          full_name: agents.full_name,
          agency_name: agents.agency_name,
          profile_photo_s3_url: agents.profile_photo_s3_url,
          whatsapp_number: agents.whatsapp_number,
          is_temporary_password: agents.is_temporary_password,
        },
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set('agentToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[agents Login API Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during authentication',
      },
      { status: 500 }
    );
  }
}