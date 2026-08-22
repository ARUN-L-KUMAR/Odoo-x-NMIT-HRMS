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
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg">
            D
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">
            Dayflow
          </span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Every workday,
            <br />
            perfectly aligned.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            Dayflow brings your HR operations together — attendance, leave,
            payroll, and team management in one seamless platform.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              "Attendance Tracking",
              "Leave Management",
              "Payroll",
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
        <div className="relative z-10 text-white/40 text-sm">
          © 2026 Dayflow. Built for modern teams.
        </div>
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
