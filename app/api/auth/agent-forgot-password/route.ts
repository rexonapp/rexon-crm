// app/api/auth/agent-forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
// import sgMail from '@sendgrid/mail';
// sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

import { BrevoClient } from '@getbrevo/brevo';
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_KEY!,
});

const secret = new TextEncoder().encode(process.env.AGENT_RESET_TOKEN_SECRET!);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Please enter your email address.' },
        { status: 400 }
      );
    }

    // ── Step 1: Look up agent by email ────────────────────────────────────────
    const agentResult = await query(
      `SELECT id, email, full_name, status
       FROM agents
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    const agent = agentResult.rows[0];

    if (!agent) {
      return NextResponse.json(
        { error: 'No account found with that email address.' },
        { status: 404 }
      );
    }

    if (agent.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // ── Step 2: Look up the agent's domain from agent_domains ─────────────────
    // Adjust column names below if your table uses different names:
    //   agent_id     → the FK referencing agents.id
    //   domain_name  → e.g. "johndoe.rexonproperties.in"
    const domainResult = await query(
      `SELECT domain_name
       FROM agent_domains
       WHERE agent_id = $1
       LIMIT 1`,
      [agent.id]
    );

    const domainRow = domainResult.rows[0];

    // Build the base URL:
    //  - If the agent has a domain row → use it (ensure https:// prefix)
    //  - If not → fall back to NEXT_PUBLIC_URL so emails still work
    let baseUrl: string;

    if (domainRow?.domain_name) {
      // domain_name is just the subdomain slug (e.g. "johndoe")
      // Full URL becomes: https://johndoe.rexonproperties.in
      const slug = (domainRow.domain_name as string).trim().replace(/\/$/, '');
      baseUrl = `https://${slug}.rexonproperties.in`;
    } else {
      // Fallback: use env var. Log a warning so it's visible in server logs.
      console.warn('[Agent Forgot-password] No domain found for agent, using NEXT_PUBLIC_URL fallback', {
        agentId: agent.id,
        email: agent.email,
      });
      baseUrl = (process.env.NEXT_PUBLIC_URL ?? '').replace(/\/$/, '');
    }

    if (!baseUrl) {
      console.error('[Agent Forgot-password] Could not determine reset URL — no domain and no NEXT_PUBLIC_URL');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // ── Step 3: Create a short-lived JWT (1 hour) ─────────────────────────────
    const token = await new SignJWT({
      sub: String(agent.id),
      email: agent.email,
      purpose: 'agent-password-reset',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    // Reset link points to the agent's own subdomain
    const resetUrl = `${baseUrl}/login/reset-password?token=${token}`;

    // ── Step 4: Send email ────────────────────────────────────────────────────
    // await sgMail.send({
    //   to: agent.email,
    //   from: {
    //     email: 'admin@rexonproperties.in',
    //     name: process.env.SENDGRID_FROM_NAME ?? 'Rexon Agent Portal',
    //   },
    //   subject: 'Reset your Rexon agent password',
    //   html: buildEmailHtml({ fullName: agent.full_name, resetUrl }),
    //   text: buildEmailText({ fullName: agent.full_name, resetUrl }),
    // });
    const emailResult =
    await brevo.transactionalEmails.sendTransacEmail({
      subject: 'Reset your Rexon agent password',
  
      sender: {
        email: 'admin@rexonproperties.in',
        name: process.env.BREVO_FROM_NAME ?? 'Rexon Agent Portal',
      },
  
      to: [
        {
          email: agent.email,
          name: agent.full_name,
        },
      ],
  
      htmlContent: buildEmailHtml({
        fullName: agent.full_name,
        resetUrl,
      }),
  
      textContent: buildEmailText({
        fullName: agent.full_name,
        resetUrl,
      }),
  
      replyTo: {
        email: 'support@rexonproperties.in',
        name: 'Rexon Support',
      },
  
      headers: {
        'X-Entity-Ref-ID': `rexon-agent-password-reset-${agent.id}-${Date.now()}`,
      },
    });

    console.log('[Agent Password Reset Email Sent]', {
      agentId: agent.id,
      email: agent.email,
      resetDomain: baseUrl,
      messageId: emailResult.messageId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'A password reset link has been sent to your email address.',
    });
  } catch (error) {
    console.error('[Agent Forgot-password Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function buildEmailHtml({ fullName, resetUrl }: { fullName: string; resetUrl: string }) {
  const firstName = fullName?.split(' ')[0] ?? 'Agent';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f172a;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-1px;">R</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <div style="font-size:18px;font-weight:600;color:#0f172a;line-height:1.2;">Rexon</div>
                    <div style="font-size:11px;color:#64748b;font-weight:500;letter-spacing:1px;text-transform:uppercase;">Agent Portal</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 36px 36px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#0f172a;">Reset your password</p>
                    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">
                      Hi ${firstName}, we received a request to reset the password for your Rexon agent account.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="border-radius:8px;background:#0f172a;">
                          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                            Set New Password →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">Or copy this link into your browser:</p>
                    <p style="margin:0 0 24px;font-size:11px;color:#3b82f6;word-break:break-all;">${resetUrl}</p>
                    <div style="height:1px;background:#e2e8f0;margin-bottom:20px;"></div>
                    <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;width:100%;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0;font-size:11px;color:#64748b;line-height:1.7;">
                            ⏱ This link expires in <strong style="color:#0f172a;">1 hour</strong> and can only be used once.<br/>
                            🔒 If you didn't request this, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.6;">
                © ${new Date().getFullYear()} Rexon. All rights reserved.<br/>
                Sent because a password reset was requested for your agent account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ fullName, resetUrl }: { fullName: string; resetUrl: string }) {
  const firstName = fullName?.split(' ')[0] ?? 'Agent';
  return `Hi ${firstName},

We received a request to reset the password for your Rexon agent account.

Click the link below to set a new password:
${resetUrl}

This link expires in 1 hour and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

— Rexon Agent Portal`;
}