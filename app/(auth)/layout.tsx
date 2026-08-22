import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white text-primary flex items-center justify-center shadow-lg shadow-black/10 ring-4 ring-white/20 shrink-0">
            <svg
              className="w-6 h-6 text-primary"
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
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-xl tracking-tight leading-snug">
              Human Resource Management System
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold text-[10px] tracking-wider uppercase backdrop-blur">
                HRMS
              </span>
              <span className="text-white/80 text-xs font-medium">
                Enterprise Platform
              </span>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Every workday,
            <br />
            perfectly aligned.
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-md">
            Human Resource Management System brings your workforce operations together — attendance, leave,
            payroll, and team management in one seamless platform.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              "Attendance Tracking",
              "Leave Management",
              "Payroll Suite",
              "Team Analytics",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm backdrop-blur"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/50 text-xs">
          © 2026 Human Resource Management System (HRMS). Built for modern teams.
        </div>
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
