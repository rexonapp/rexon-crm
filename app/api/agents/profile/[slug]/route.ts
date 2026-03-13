import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid profile slug' }, { status: 400 });
    }

    const result = await query(
      `SELECT 
         a.full_name, a.email, a.mobile_number, a.whatsapp_number,
         a.city, a.state, a.agency_name, a.bio,
         a.profile_photo_s3_url, a.languages_spoken,
         a.is_verified, a.status,
         d.domain_name, d.full_domain
       FROM agents a
       JOIN agent_domains d ON d.agent_id = a.id
       WHERE d.domain_name = $1
         AND d.is_active = true
         AND d.status = 'active'
         AND a.status = 'approved'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = result.rows[0];

    // Normalize languages to always return a clean string[]
    const languages: string[] = Array.isArray(agent.languages_spoken)
      ? agent.languages_spoken
      : agent.languages_spoken
      ? agent.languages_spoken.split(',').map((l: string) => l.trim())
      : [];

    return NextResponse.json({
      success: true,
      agent: {
        full_name: agent.full_name,
        email: agent.email,
        mobile_number: agent.mobile_number,
        whatsapp_number: agent.whatsapp_number,
        city: agent.city,
        state: agent.state,
        agency_name: agent.agency_name,
        bio: agent.bio,
        profile_photo_s3_url: agent.profile_photo_s3_url,
        languages_spoken: languages,
        is_verified: agent.is_verified,
        domain_name: agent.domain_name,
        full_domain: agent.full_domain,
      },
    });

  } catch (error) {
    console.error('Agent profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent profile' }, { status: 500 });
  }
}   