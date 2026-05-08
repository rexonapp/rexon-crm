"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";

/* ─────────────────────────────────────────────
   LOGO
   ───────────────────────────────────────────── */
function RexonLogo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/rexon-logo.png"
        alt="Rexon logo"
        width={180}
        height={48}
        priority
        className="h-auto w-[160px] md:w-[180px]"
      />
      <p className="text-[12px] text-muted-foreground font-medium tracking-wide leading-tight">
        Agent Portal
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOGIN PAGE
   ───────────────────────────────────────────── */
export default function AgentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });
  
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Authentication failed");
        setLoading(false);
        return;
      }
  
      if (data.token) {
        // Check if using temporary password
        const isTempPassword =
          data.agent.is_temporary_password === true ||
          data.agent.is_temporary_password === "true" ||
          data.agent.is_temporary_password === 1;
  
        if (isTempPassword) {
          sessionStorage.setItem("tempPassword", password);
          router.push("/login/change-password");
        } else {
          window.location.href = "/";
        }
      } else {
        setError("No token received. Please contact administrator.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background flex flex-col items-center justify-center px-4 py-6">
      {/* Container */}
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        {/* <div className="mb-1 flex justify-center">
          <RexonLogo />
        </div> */}

        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/rexon-logo.png" alt="Rexon" className="h-20 w-auto object-contain" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/90 shadow-sm p-6 md:p-7 backdrop-blur">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight mb-2">
              Sign In
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Enter your credentials to access your agent dashboard
            </p>
          </div>

          {/* Info Box */}
          <div className="mb-6 flex gap-3 p-3.5 rounded-lg border border-border bg-muted/30">
            <Info className="w-[18px] h-[18px] text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              Use the temporary password from your invite email. You'll be asked to
              create a new password on first login.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div
                className="flex gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="w-[18px] h-[18px] text-destructive shrink-0 mt-0.5" />
                <p className="text-[13px] text-destructive leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="agent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">
                  Password
                </Label>
                <div className="flex items-center gap-3">
                  <Link
                    href="/login/forgot-password"
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    Forgot password?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-10 text-[14px] bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-10 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <Separator className="my-6" />

          {/* Footer Info */}
          <div className="space-y-3 text-center">
            <p className="text-[12px] text-muted-foreground">
              Don't have an account yet?
            </p>
            <p className="text-[12px] text-muted-foreground/70">
              An admin will send you an invite email with login credentials.
            </p>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground/60 mt-3">
                Having trouble logging in?
              </p>
              <button
                type="button"
                className="text-[11px] text-foreground font-medium hover:underline mt-1"
              >
                Contact administrator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}