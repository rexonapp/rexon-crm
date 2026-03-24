"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Mail, ArrowLeft, Loader2, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";

/* ─────────────────────────────────────────────
   LOGO — same as login page
   ───────────────────────────────────────────── */
function RexonLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
        <span className="text-[16px] font-extrabold text-background tracking-tight">
          R
        </span>
      </div>
      <div>
        <div className="text-[18px] font-semibold text-foreground leading-tight tracking-tight">
          Rexon
        </div>
        <div className="text-[12px] text-muted-foreground font-medium tracking-wide leading-tight mt-0.5">
          Agent Portal
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORGOT PASSWORD PAGE
   ───────────────────────────────────────────── */
export default function AgentForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/agent-forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <RexonLogo />
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div className="text-center">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-[24px] font-semibold text-foreground mb-2 tracking-tight">
              Check your inbox
            </h1>
            <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
              A password reset link has been sent to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              The link expires in <span className="font-medium text-foreground">1 hour</span>.
            </p>

            <div className="mb-6 flex gap-3 p-3.5 rounded-lg border border-border bg-muted/30 text-left">
              <Info className="w-[18px] h-[18px] text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="text-foreground font-medium hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-semibold text-foreground tracking-tight mb-2">
                Forgot Password
              </h1>
              <p className="text-[14px] text-muted-foreground">
                Enter your email address and we'll send you a secure reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
                  <AlertCircle className="w-[18px] h-[18px] text-destructive shrink-0 mt-0.5" />
                  <p className="text-[13px] text-destructive leading-relaxed">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-10 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}