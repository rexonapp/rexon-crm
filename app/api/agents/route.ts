import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Agent } from '@/types';

const AGENT_SELECT = `
  SELECT
    id, full_name, email, mobile_number, city, address,
    date_of_birth, gender, agency_name, license_number,
    experience_years, properties_managed, specialization,
    profile_photo_s3_key, profile_photo_s3_url,
    kyc_document_s3_key, kyc_document_s3_url,
    terms_accepted, is_verified, status, created_at, updated_at
  FROM agents
`;

/* ─────────────────────────────────────────────
   GET /api/agents
   ───────────────────────────────────────────── */
export async function GET() {
  try {
    const result = await query(`${AGENT_SELECT} ORDER BY created_at DESC`);

    return NextResponse.json({
      success: true,
      data: result.rows as Agent[],
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('[GET /api/agents]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents', detail: error.message },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────
   POST /api/agents
   ───────────────────────────────────────────── */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      full_name,
      email,
      mobile_number,
      city,
      address,
      date_of_birth,
      gender,
      agency_name,
      license_number,
      experience_years,
      properties_managed,
      specialization,
      terms_accepted,
    } = body;

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'full_name and email are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO agents (
       full_name, email, mobile_number, city, address,
        date_of_birth, gender, agency_name, license_number,
        experience_years, properties_managed, specialization,
        terms_accepted, status, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',NOW(),NOW()
      ) RETURNING *`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        mobile_number ?? null,
        city ?? null,
        address ?? null,
        date_of_birth || null,
        gender ?? null,
        agency_name ?? null,
        license_number ?? null,
        parseInt(experience_years) || 0,
        parseInt(properties_managed) || 0,
        specialization ?? null,
        terms_accepted ?? false,
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] as Agent, message: 'Agent created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/agents]', error);

    if (error.code === '23505') {
      const field = error.constraint?.includes('email') ? 'email' : 'license number';
      return NextResponse.json(
        { success: false, error: `An agent with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create agent', detail: error.message },
      { status: 500 }
    );
  }
}