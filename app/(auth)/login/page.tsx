"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    const result = await signIn("credentials", {
      identifier: data.identifier,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid Login ID / Email or password. Please try again.");
      return;
    }

    router.push("/employees");
    router.refresh();
  };

  const fillDemo = (type: "superAdmin" | "admin" | "employee") => {
    const account = DEMO_ACCOUNTS[type];
    setValue("identifier", account.email);
    setValue("password", account.password);
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-6 lg:hidden">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight">Human Resource Management System</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold text-[10px]">HRMS</span>
              <span className="text-[11px] text-muted-foreground">Enterprise Portal</span>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm">
          Sign in with your Login ID or Email address
        </p>
      </div>

      {/* Demo accounts */}
      <div className="rounded-xl border border-dashed p-4 space-y-3 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Sign-In (Demo Credentials)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Org Admin */}
          <button
            type="button"
            onClick={() => fillDemo("admin")}
            className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border bg-background hover:bg-accent hover:border-primary/40 transition-all text-left group shadow-2xs"
          >
            <span className="text-xs font-bold text-primary group-hover:underline">
              Org Admin
            </span>
            <span className="text-[11px] text-muted-foreground font-mono truncate w-full">
              {DEMO_ACCOUNTS.admin.email}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {DEMO_ACCOUNTS.admin.password}
            </span>
          </button>

          {/* 2. Employee */}
          <button
            type="button"
            onClick={() => fillDemo("employee")}
            className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border bg-background hover:bg-accent hover:border-primary/40 transition-all text-left group shadow-2xs"
          >
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
              Employee
            </span>
            <span className="text-[11px] text-muted-foreground font-mono truncate w-full">
              {DEMO_ACCOUNTS.employee.email}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {DEMO_ACCOUNTS.employee.password}
            </span>
          </button>

          {/* 3. Super Admin */}
          <button
            type="button"
            onClick={() => fillDemo("superAdmin")}
            className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border bg-background hover:bg-accent hover:border-primary/40 transition-all text-left group shadow-2xs"
          >
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
              Super Admin
            </span>
            <span className="text-[11px] text-muted-foreground font-mono truncate w-full">
              {DEMO_ACCOUNTS.superAdmin.email}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {DEMO_ACCOUNTS.superAdmin.password}
            </span>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="identifier">Login ID / Email</Label>
          <Input
            id="identifier"
            type="text"
            placeholder="DFJODO20240001 or you@company.com"
            autoComplete="username"
            {...register("identifier")}
            className={errors.identifier ? "border-destructive" : ""}
          />
          {errors.identifier && (
            <p className="text-xs text-destructive">{errors.identifier.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Use your auto-generated Login ID or registered email address
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register("password")}
              className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
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
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </>
          )}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          New Organization?{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            <Building2 className="h-3.5 w-3.5" />
            Register Organization
          </Link>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Employees are added by their Organization HR Administrator
        </p>
      </div>
    </div>
  );
}
