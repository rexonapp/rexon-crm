//api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

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

    if (agentsResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const agents = agentsResult.rows[0];

    if (agents.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Your account is not approved yet, Please contact your administrator.' },
        { status: 401 }
      );
    }

    let passwordMatches = false;

    if (agents.is_temporary_password && agents.password_salt) {
      if (password === agents.password_salt) {
        passwordMatches = true;
      }
    }

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
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { agentId: agents.id, email: agents.email, type: 'agents' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    try {
      await query(`UPDATE agents SET updated_at = NOW() WHERE id = $1`, [agents.id]);
    } catch (err) {
      console.error('[Update Last Login Error]', {
        error: err instanceof Error ? err.message : 'Unknown error',
        agentsId: agents.id,
        timestamp: new Date().toISOString(),
      });
    }

    console.log('[agents Login Success]', {
      agentsId: agents.id,
      email: agents.email,
      timestamp: new Date().toISOString(),
    });

    const agentPayload = {
      id: agents.id,
      email: agents.email,
      full_name: agents.full_name,
      agency_name: agents.agency_name,
      profile_photo_s3_url: agents.profile_photo_s3_url,
      whatsapp_number: agents.whatsapp_number,
      is_temporary_password: agents.is_temporary_password,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        agent: agentPayload,
      },
      { status: 200 }
    );

    // ✅ Detect host to avoid setting wrong domain on vercel.app
    const host = request.headers.get('host') || '';
    const isVercelOrLocal =
      host.includes('vercel.app') || host.includes('localhost');

    const cookieDomain = isVercelOrLocal
      ? undefined                    // no domain = scoped to current host automatically
      : '.rexonproperties.in';       // covers all subdomains on production

    const cookieBase = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      domain: cookieDomain,
    };

    // 1. httpOnly — JWT for middleware + API auth
    response.cookies.set('agentToken', token, {
      ...cookieBase,
      httpOnly: true,
    });

    // 2. Readable — agentId for building API URLs client-side
    response.cookies.set('agentId', agents.id, {
      ...cookieBase,
      httpOnly: false,
    });

    // 3. Readable — agentData for showing name/photo in UI without extra fetch
    response.cookies.set(
      'agentData',
      encodeURIComponent(JSON.stringify(agentPayload)),
      {
        ...cookieBase,
        httpOnly: false,
      }
    );

    return response;
  } catch (error) {
    console.error('[agents Login API Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: false, error: 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}