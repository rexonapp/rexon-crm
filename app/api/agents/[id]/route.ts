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
   GET /api/agents/[id]

   FIX 1: Next.js 15 made `params` a Promise —
           must `await params` before accessing .id
   FIX 2: IDs are UUIDs — never parseInt them,
           just pass the raw string to Postgres
   ─────────────────────────────────────────────  */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Invalid agent ID' },
      { status: 400 }
    );
  }

  try {
    const result = await query(`${AGENT_SELECT} WHERE id = $1`, [id]);

    if (!result.rowCount) {
      return NextResponse.json(
        { success: false, error: `Agent with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] as Agent });
  } catch (error: any) {
    console.error(`[GET /api/agents/${id}]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent', detail: error.message },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────
   PATCH /api/agents/[id]
   ─────────────────────────────────────────────  */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Invalid agent ID' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const ALLOWED_FIELDS = [
      'full_name', 'email', 'mobile_number', 'city', 'address',
      'date_of_birth', 'gender', 'agency_name', 'license_number',
      'experience_years', 'properties_managed', 'specialization',
      'terms_accepted', 'is_verified', 'status',
    ] as const;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        let value = body[field];

        if (field === 'experience_years' || field === 'properties_managed') {
          value = parseInt(value) || 0;
        }
        if (field === 'full_name' || field === 'email') {
          value = (value as string).trim();
          if (!value) {
            return NextResponse.json(
              { success: false, error: `${field} cannot be empty` },
              { status: 400 }
            );
          }
        }
        if (field === 'date_of_birth' && !value) value = null;

        updates.push(`${field} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { success: false, error: `Agent with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0] as Agent,
      message: 'Agent updated successfully',
    });
  } catch (error: any) {
    console.error(`[PATCH /api/agents/${id}]`, error);

    if (error.code === '23505') {
      const field = error.constraint?.includes('email') ? 'email' : 'license number';
      return NextResponse.json(
        { success: false, error: `An agent with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update agent', detail: error.message },
      { status: 500 }
    );
  }
}