"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Lock, Check, Loader2, ShieldCheck } from "lucide-react";

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

function isPasswordValid(requirements: PasswordRequirements): boolean {
  return Object.values(requirements).every(Boolean);
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requirements = validatePassword(newPassword);
  const isValid =
    isPasswordValid(requirements) &&
    newPassword === confirmPassword &&
    currentPassword.length > 0;

  // ✅ Prefill temp password from localStorage on mount
  useEffect(() => {
    const tempPassword = localStorage.getItem("tempPassword");
    if (tempPassword) {
      setCurrentPassword(tempPassword);
    } else {
      // No temp password found — shouldn't be on this page
      router.push("/login");
    }
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Please ensure all password requirements are met");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const agentId = localStorage.getItem("agentId");
      const token = localStorage.getItem("agentToken");

      if (!agentId || !token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/agents/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to change password");
        setLoading(false);
        return;
      }

      // ✅ Clean up temp password from localStorage after success
      localStorage.removeItem("tempPassword");

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Change password error:", err);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-[24px] font-semibold text-foreground mb-2">
            Password Changed
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            Your password has been successfully updated. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight mb-2">
            Create New Password
          </h1>
          <p className="text-[14px] text-muted-foreground">
            You're logging in with a temporary password. Please create a secure
            password for your account.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {error && (
            <div className="flex gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
              <AlertCircle className="w-[18px] h-[18px] text-destructive shrink-0 mt-0.5" />
              <p className="text-[13px] text-destructive leading-relaxed">{error}</p>
            </div>
          )}

          {/* ✅ Prefilled + disabled temp password field */}
          <div className="space-y-2">
            <Label htmlFor="current" className="text-[13px] font-semibold text-foreground">
              Temporary Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="current"
                type="password"
                value={currentPassword}
                disabled={true}
                className="pl-10 pr-10 h-10 text-[14px] bg-muted/50 border-transparent cursor-not-allowed opacity-60"
                required
              />
              {/* Lock badge to signal it's auto-filled */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Auto-filled from your login session
            </p>
          </div>

          <Separator />

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new" className="text-[13px] font-semibold text-foreground">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="new"
                type={showNewPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="pl-10 pr-16 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {showNewPassword ? "Hide" : "Show"}
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
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="pl-10 pr-16 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[12px] text-destructive">Passwords do not match</p>
            )}
          </div>

          {/* Password Requirements */}
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
            className="w-full h-10 text-[13px] font-semibold rounded-lg bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              "Create New Password"
            )}
          </Button>
        </form>

        <Separator className="my-6" />

        <p className="text-center text-[12px] text-muted-foreground/70">
          Your password must be strong and secure to protect your account.
        </p>
      </div>
    </div>
  );
}