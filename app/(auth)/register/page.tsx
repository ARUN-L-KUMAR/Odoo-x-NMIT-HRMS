"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Building2, Loader2, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companySetupSchema, type CompanySetupInput } from "@/lib/validations";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function CompanySetupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    loginId: string;
    companyName: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanySetupInput>({
    resolver: zodResolver(companySetupSchema),
  });

  const onSubmit = async (data: CompanySetupInput) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error?.message || "Setup failed. Please try again.");
        return;
      }

      // Show success with generated Login ID
      setSuccess({
        loginId: result.data.loginId,
        companyName: data.companyName,
      });

      // Auto sign-in
      await signIn("credentials", {
        identifier: result.data.loginId,
        password: data.password,
        redirect: false,
      });

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message || "Setup failed. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Setup Complete!</h2>
          <p className="text-muted-foreground text-sm">
            <strong>{success.companyName}</strong> is ready. Redirecting to your dashboard...
          </p>
        </div>

        <div className="rounded-xl border bg-muted/50 p-4 text-left space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Your Login ID (save this!)
          </p>
          <div className="flex items-center gap-2">
            <code className="text-lg font-bold font-mono text-primary bg-primary/10 px-3 py-1.5 rounded flex-1 text-center">
              {success.loginId}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(success.loginId)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Copy Login ID"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this ID or your email to sign in. Share employee Login IDs when you add staff via the Employees page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            D
          </div>
          <span className="font-semibold text-lg">Dayflow</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Company Setup</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Set up your organization and create your Admin account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="e.g. Acme Corp"
            {...register("companyName")}
            className={errors.companyName ? "border-destructive" : ""}
          />
          {errors.companyName && (
            <p className="text-xs text-destructive">{errors.companyName.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Initials used to generate employee Login IDs (e.g. <strong>AC</strong>JODO20240001)
          </p>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Your Full Name</Label>
          <Input
            id="name"
            placeholder="Jane Doe"
            {...register("name")}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@company.com"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91-9800000000"
            {...register("phone")}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 chars, upper, lower, number"
              {...register("password")}
              className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              {...register("confirmPassword")}
              className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 mr-2" />
              Create Company & Admin Account
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already set up?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
