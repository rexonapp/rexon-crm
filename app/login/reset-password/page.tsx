"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Lock,
  Check,
  Loader2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ─────────────────────────────────────────────
   LOGO
   ───────────────────────────────────────────── */
function RexonLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center">
        <span className="text-[16px] font-extrabold text-white tracking-tight">
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
   PASSWORD REQUIREMENTS
   ───────────────────────────────────────────── */
interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function validatePassword(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function isPasswordValid(req: PasswordRequirements): boolean {
  return Object.values(req).every(Boolean);
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {met ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
      )}
      <span className={met ? "text-foreground font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUCCESS SCREEN
   ───────────────────────────────────────────── */
function SuccessScreen() {
  return (
    <div className="text-center">
      {/* Animated checkmark */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-20 h-20 rounded-full border-2 border-green-200 bg-green-50 flex items-center justify-center">
            <ShieldCheck className="w-9 h-9 text-green-600" />
          </div>
          {/* Small badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-600 border-2 border-background flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      <h1 className="text-[26px] font-semibold text-foreground tracking-tight mb-2">
        Password Updated
      </h1>
      <p className="text-[14px] text-muted-foreground leading-relaxed mb-2">
        Your password has been changed successfully.
      </p>
      <p className="text-[13px] text-muted-foreground/70 mb-8">
        You can now sign in with your new password.
      </p>

      {/* What changed summary */}
      <div className="mb-8 text-left p-4 rounded-lg border border-border bg-muted/30 space-y-2.5">
        <p className="text-[12px] font-semibold text-foreground">What was updated:</p>
        <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
          Password changed to your new secure password
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
          Temporary password access removed
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
          Reset link has been invalidated
        </div>
      </div>

      <Link href="/login">
        <Button className="w-full h-10 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background transition-colors">
          Sign In Now
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>

      <p className="mt-4 text-[11.5px] text-muted-foreground/60">
        Use your new password to access your agent dashboard.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RESET PASSWORD FORM
   ───────────────────────────────────────────── */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const requirements = validatePassword(newPassword);
  const isValid =
    isPasswordValid(requirements) &&
    newPassword === confirmPassword &&
    newPassword.length > 0;

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`/api/auth/agent-verify-reset-token?token=${encodeURIComponent(token)}`)
      .then((r) => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) { setError("Please ensure all password requirements are met."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/agent-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reset failed. Please request a new link."); return; }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success ── */
  if (success) return <SuccessScreen />;

  /* ── Token loading ── */
  if (tokenValid === null) {
    return (
      <div className="flex items-center justify-center py-16 gap-2.5 text-muted-foreground text-[14px]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verifying reset link...
      </div>
    );
  }

  /* ── Invalid / expired token ── */
  if (tokenValid === false) {
    return (
      <div className="text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/5 border border-destructive/20">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-[24px] font-semibold text-foreground mb-2 tracking-tight">
          Link Expired
        </h1>
        <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
          This reset link has expired or has already been used. Reset links are
          valid for <span className="font-medium text-foreground">1 hour</span>.
        </p>
        <Link href="/login/forgot-password">
          <Button className="bg-foreground hover:bg-foreground/90 text-background text-[13px] font-semibold h-10 px-6 rounded-lg">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight mb-2">
          Set New Password
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Create a strong, secure password for your agent account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
            <AlertCircle className="w-[18px] h-[18px] text-destructive shrink-0 mt-0.5" />
            <p className="text-[13px] text-destructive leading-relaxed">{error}</p>
          </div>
        )}

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="new" className="text-[13px] font-semibold text-foreground">
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="new"
              type={showNew ? "text" : "password"}
              placeholder="Create a strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="pl-10 pr-16 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {showNew ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-[13px] font-semibold text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="pl-10 pr-16 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[12px] text-destructive">Passwords do not match</p>
          )}
          {newPassword && confirmPassword && newPassword === confirmPassword && (
            <p className="text-[12px] text-green-600 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Passwords match
            </p>
          )}
        </div>

        {/* Requirements */}
        {newPassword && (
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2">
            <p className="text-[12px] font-semibold text-foreground mb-2.5">
              Password Requirements:
            </p>
            <RequirementItem met={requirements.minLength} label="At least 8 characters" />
            <RequirementItem met={requirements.hasUppercase} label="One uppercase letter (A-Z)" />
            <RequirementItem met={requirements.hasLowercase} label="One lowercase letter (a-z)" />
            <RequirementItem met={requirements.hasNumber} label="One number (0-9)" />
            <RequirementItem met={requirements.hasSpecial} label="One special character (!@#$%^&*)" />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !isValid}
          className="w-full h-10 text-[13px] font-semibold rounded-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Updating Password...
            </>
          ) : (
            "Update Password"
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
  );
}

/* ─────────────────────────────────────────────
   PAGE EXPORT
   ───────────────────────────────────────────── */
export default function AgentResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex justify-center">
          <RexonLogo />
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16 gap-2.5 text-muted-foreground text-[14px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}