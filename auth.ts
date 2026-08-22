import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { comparePassword } from "@/lib/auth/password";
import { z } from "zod";

import { sendLoginAlertEmail } from "@/lib/mail";

// Accept either email OR employeeId (Login ID) in the identifier field
const loginSchema = z.object({
  identifier: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Login ID or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;

        // Find by email OR employeeId (Login ID)
        const isEmail = identifier.includes("@");
        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: identifier }
            : { employeeId: identifier },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                department: true,
                designation: true,
                profileImage: true,
              },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          employeeId: user.employeeId,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          companyId: user.companyId ?? user.company?.id ?? null,
          companyName: user.company?.name ?? null,
          companyInitials: user.company?.initials ?? null,
          companyLogo: user.company?.logoUrl ?? null,
          name: user.employee
            ? `${user.employee.firstName} ${user.employee.lastName}`
            : user.employeeId,
          image: user.employee?.profileImage ?? null,
          employeeDbId: user.employee?.id ?? null,
          department: user.employee?.department ?? null,
          designation: user.employee?.designation ?? null,
        };
      },
    }),
  ],

  events: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const userName = (user as any).name || (user as any).employeeId || "User";
          const employeeId = (user as any).employeeId || user.email;
          const role = (user as any).role || "EMPLOYEE";
          const companyName = (user as any).companyName || "Dayflow HRMS";

          // Send asynchronous login alert email
          sendLoginAlertEmail({
            to: user.email,
            userName,
            employeeId,
            role,
            companyName,
          }).catch((err) => console.error("[SIGNIN_EMAIL_FAILED]", err));
        } catch (e) {
          console.error("[SIGNIN_EVENT_ERROR]", e);
        }
      }
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.employeeId = (user as any).employeeId;
        token.role = (user as any).role;
        token.employeeDbId = (user as any).employeeDbId;
        token.department = (user as any).department;
        token.designation = (user as any).designation;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
        token.companyInitials = (user as any).companyInitials;
        token.companyLogo = (user as any).companyLogo;
      }
      if (trigger === "update" && session) {
        if (typeof session.mustChangePassword === "boolean") {
          token.mustChangePassword = session.mustChangePassword;
        }
        if (session.companyName) token.companyName = session.companyName;
        if (session.companyLogo) token.companyLogo = session.companyLogo;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.employeeId = token.employeeId as string;
        session.user.role = token.role as string;
        session.user.employeeDbId = token.employeeDbId as string | null;
        session.user.department = token.department as string | null;
        session.user.designation = token.designation as string | null;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.companyId = (token.companyId as string) || null;
        session.user.companyName = (token.companyName as string) || null;
        session.user.companyInitials = (token.companyInitials as string) || null;
        session.user.companyLogo = (token.companyLogo as string) || null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.AUTH_SECRET,
});
