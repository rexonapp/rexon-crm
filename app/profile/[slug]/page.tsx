import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { MapPin, Phone, MessageCircle, Building2, Globe, CheckCircle2, Mail } from 'lucide-react';

interface AgentProfile {
  full_name: string;
  email: string;
  mobile_number: string;
  whatsapp_number?: string;
  city?: string;
  state?: string;
  agency_name?: string;
  bio?: string;
  profile_photo_s3_url?: string;
  languages_spoken: string[];
  is_verified: boolean;
  domain_name: string;
  full_domain: string;
}

interface Props {
  params: Promise<{ slug: string }>;
}

// ── Query DB directly — bypasses all HTTP/subdomain routing issues ────────────
async function getAgentProfile(slug: string): Promise<AgentProfile | null> {
  try {
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

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];

    const languages: string[] = Array.isArray(agent.languages_spoken)
      ? agent.languages_spoken
      : agent.languages_spoken
      ? agent.languages_spoken.split(',').map((l: string) => l.trim())
      : [];

    return {
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
    };
  } catch (error) {
    console.error('getAgentProfile error:', error);
    return null;
  }
}

export default async function AgentPublicProfilePage({ params }: Props) {
  const { slug } = await params;
  const agent = await getAgentProfile(slug);

  if (!agent) notFound();

  const initials = agent.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const whatsappUrl = agent.whatsapp_number
    ? `https://wa.me/91${agent.whatsapp_number}?text=Hi%2C%20I%20found%20your%20profile%20on%20Rexon%20Properties`
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F5F2; color: #1a1a1a; min-height: 100vh; }
        .page-wrap { min-height: 100vh; background: #F7F5F2; }
        .topnav { background: #fff; border-bottom: 1px solid #E8E4DF; padding: 14px 24px; position: sticky; top: 0; z-index: 10; }
        .topnav-inner { max-width: 680px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-mark { width: 32px; height: 32px; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'DM Serif Display', serif; font-size: 16px; }
        .logo-text { font-size: 14px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.2px; }
        .domain-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #999; background: #F7F5F2; padding: 5px 10px; border-radius: 20px; border: 1px solid #E8E4DF; }
        .content { max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; display: flex; flex-direction: column; gap: 16px; }
        .hero-card { background: #fff; border-radius: 20px; border: 1px solid #E8E4DF; overflow: hidden; }
        .hero-cover { height: 100px; background: linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 50%, #1a1a1a 100%); position: relative; }
        .hero-cover::after { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E"); }
        .hero-body { padding: 0 24px 28px; }
        .avatar-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: -40px; margin-bottom: 16px; }
        .avatar-img { width: 80px; height: 80px; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.12); object-fit: cover; }
        .avatar-fallback { width: 80px; height: 80px; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.12); background: #E8E4DF; display: flex; align-items: center; justify-content: center; font-family: 'DM Serif Display', serif; font-size: 26px; color: #666; }
        .verified-badge { display: inline-flex; align-items: center; gap: 4px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 20px; border: 1px solid #BFDBFE; }
        .agent-name { font-family: 'DM Serif Display', serif; font-size: 28px; color: #1a1a1a; line-height: 1.2; margin-bottom: 6px; }
        .meta-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #888; margin-top: 4px; }
        .divider { width: 100%; height: 1px; background: #F0ECE8; margin: 20px 0; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .contact-grid.single { grid-template-columns: 1fr; }
        .btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.15s ease; }
        .btn-primary { background: #1a1a1a; color: #fff; }
        .btn-primary:hover { background: #333; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .btn-whatsapp { background: #22C55E; color: #fff; }
        .btn-whatsapp:hover { background: #16A34A; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
        .card { background: #fff; border-radius: 20px; border: 1px solid #E8E4DF; padding: 24px; }
        .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #bbb; margin-bottom: 12px; }
        .bio-text { font-size: 14px; color: #555; line-height: 1.75; }
        .lang-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .lang-chip { background: #F7F5F2; border: 1px solid #E8E4DF; color: #555; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 20px; }
        .email-link { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #555; text-decoration: none; }
        .email-link:hover { color: #1a1a1a; }
        .footer { text-align: center; font-size: 11px; color: #bbb; padding-top: 8px; }
        .footer a { color: #999; font-weight: 500; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        @media (max-width: 480px) { .contact-grid { grid-template-columns: 1fr; } .agent-name { font-size: 24px; } }
      `}</style>

      <div className="page-wrap">
        <nav className="topnav">
          <div className="topnav-inner">
            <a href="https://rexonproperties.in" className="logo">
              <div className="logo-mark">R</div>
              <span className="logo-text">Rexon Properties</span>
            </a>
            <div className="domain-pill">
              <Globe size={10} />
              {agent.full_domain}
            </div>
          </div>
        </nav>

        <div className="content">
          <div className="hero-card">
            <div className="hero-cover" />
            <div className="hero-body">
              <div className="avatar-row">
                {agent.profile_photo_s3_url ? (
                  <img
                    src={agent.profile_photo_s3_url}
                    alt={agent.full_name}
                    className="avatar-img"
                  />
                ) : (
                  <div className="avatar-fallback">{initials}</div>
                )}
                {agent.is_verified && (
                  <div className="verified-badge">
                    <CheckCircle2 size={11} />
                    Verified Agent
                  </div>
                )}
              </div>

              <h1 className="agent-name">{agent.full_name}</h1>

              {agent.agency_name && (
                <div className="meta-row">
                  <Building2 size={13} />
                  {agent.agency_name}
                </div>
              )}
              {(agent.city || agent.state) && (
                <div className="meta-row">
                  <MapPin size={13} />
                  {[agent.city, agent.state].filter(Boolean).join(', ')}
                </div>
              )}

              <div className="divider" />

              <div className={`contact-grid${!whatsappUrl ? ' single' : ''}`}>
                <a href={`tel:${agent.mobile_number}`} className="btn btn-primary">
                  <Phone size={15} />
                  Call Agent
                </a>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {agent.bio && (
            <div className="card">
              <p className="card-label">About</p>
              <p className="bio-text">{agent.bio}</p>
            </div>
          )}

          {agent.languages_spoken.length > 0 && (
            <div className="card">
              <p className="card-label">Languages Spoken</p>
              <div className="lang-chips">
                {agent.languages_spoken.map((lang) => (
                  <span key={lang} className="lang-chip">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {agent.email && (
            <div className="card">
              <p className="card-label">Email</p>
              <a href={`mailto:${agent.email}`} className="email-link">
                <Mail size={14} style={{ opacity: 0.5 }} />
                {agent.email}
              </a>
            </div>
          )}

          <p className="footer">
            Powered by{' '}
            <a href="https://rexonproperties.in">Rexon Properties</a>
          </p>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const agent = await getAgentProfile(slug);
  if (!agent) return {};

  return {
    title: `${agent.full_name} — ${agent.agency_name || 'Real Estate Agent'} | Rexon Properties`,
    description: agent.bio?.slice(0, 160) || `Connect with ${agent.full_name} on Rexon Properties`,
    openGraph: {
      title: `${agent.full_name} | Rexon Properties`,
      description: agent.bio?.slice(0, 160),
      images: agent.profile_photo_s3_url ? [agent.profile_photo_s3_url] : [],
    },
  };
}