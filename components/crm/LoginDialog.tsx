"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";

/* ─────────────────────────────────────────────
   FIELD COMPONENT
   ───────────────────────────────────────────── */
function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  rightElement,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rightElement?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 7,
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </label>
        {rightElement}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: `1px solid ${focused ? "var(--gold)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "var(--radius-sm)",
          padding: "11px 14px",
          fontSize: 14,
          fontFamily: "var(--font-body)",
          color: "var(--text)",
          outline: "none",
          transition: "border-color var(--transition), box-shadow var(--transition)",
          boxShadow: focused ? "0 0 0 3px var(--gold-dim)" : "none",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SOCIAL BUTTON
   ───────────────────────────────────────────── */
function SocialButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        background: hovered ? "var(--surface-3)" : "var(--surface-2)",
        border: `1px solid ${hovered ? "var(--border-hover)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 500,
        color: hovered ? "var(--text)" : "var(--text-subtle)",
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        transition: "all var(--transition)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────
   LOGIN DIALOG COMPONENT
   ───────────────────────────────────────────── */
export default function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 100,
            animation: "fadeIn 0.2s ease",
          }}
        />

        {/* Dialog Panel */}
        <Dialog.Content
          aria-describedby="login-description"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--surface)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-xl)",
            width: "min(460px, calc(100vw - 32px))",
            zIndex: 110,
            overflow: "hidden",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
            animation: "slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* ── Gradient Header ─────────────── */}
          <div
            style={{
              background: "linear-gradient(145deg, #0f1726 0%, #1a2545 50%, #0f1a30 100%)",
              padding: "36px 36px 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow orb */}
            <div
              style={{
                position: "absolute",
                width: 320,
                height: 320,
                background:
                  "radial-gradient(circle, rgba(201,168,76,0.13) 0%, transparent 65%)",
                top: -120,
                right: -60,
                pointerEvents: "none",
              }}
            />
            {/* Second orb */}
            <div
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                background:
                  "radial-gradient(circle, rgba(59,91,219,0.1) 0%, transparent 70%)",
                bottom: -60,
                left: -40,
                pointerEvents: "none",
              }}
            />

            {/* Brand */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 26,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background:
                    "linear-gradient(135deg, var(--gold), var(--gold-light))",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0b0f1a",
                  boxShadow: "0 4px 24px rgba(201,168,76,0.45)",
                }}
              >
                A
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--text)",
                    lineHeight: 1.1,
                  }}
                >
                  Rexon
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                >
                  CRM Platform
                </div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ position: "relative" }}>
              <Dialog.Title
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                Welcome back
              </Dialog.Title>
              <Dialog.Description
                id="login-description"
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Sign in to your workspace to access your deals, contacts, and pipeline.
              </Dialog.Description>
            </div>

            {/* Close Button */}
            <Dialog.Close asChild>
              <button
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 32,
                  height: 32,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all var(--transition)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.15)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-muted)";
                }}
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* ── Form Body ───────────────────── */}
          <div style={{ padding: "28px 36px 32px" }}>
            {/* Social Buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <SocialButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
                label="Google"
              />
              <SocialButton
                icon={<span style={{ fontSize: 16, lineHeight: 1 }}>⌘</span>}
                label="Single Sign-On"
              />
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              <span
                style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}
              >
                or sign in with email
              </span>
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </div>

            {/* Fields */}
            <Field
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
            />

            <Field
              label="Password"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={setPassword}
              rightElement={
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--gold)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </span>
              }
            />

            {/* Remember Me */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 22,
                marginTop: -6,
              }}
            >
              <Checkbox.Root
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: remember ? "var(--gold)" : "var(--surface-2)",
                  border: `1px solid ${remember ? "var(--gold)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all var(--transition)",
                }}
              >
                <Checkbox.Indicator>
                  <span style={{ fontSize: 10, color: "#0b0f1a", lineHeight: 1 }}>
                    ✓
                  </span>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Keep me signed in for 30 days
              </span>
            </div>

            {/* Submit */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                background: loading
                  ? "rgba(201,168,76,0.5)"
                  : "linear-gradient(135deg, var(--gold), var(--gold-muted))",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "13px",
                fontSize: 15,
                fontWeight: 600,
                color: "#0b0f1a",
                fontFamily: "var(--font-body)",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all var(--transition)",
                marginBottom: 16,
                boxShadow: loading ? "none" : "var(--shadow-gold)",
                letterSpacing: "0.2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(0,0,0,0.3)",
                      borderTopColor: "#0b0f1a",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  Signing in…
                </>
              ) : (
                "Sign in to Dashboard →"
              )}
            </button>

            {/* Footer */}
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              Don&apos;t have an account?{" "}
              <span
                style={{
                  color: "var(--gold)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Start free 14-day trial
              </span>
            </p>
          </div>

          {/* Spinner keyframes */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}