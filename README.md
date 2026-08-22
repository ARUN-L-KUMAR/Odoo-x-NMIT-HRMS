# Dayflow — HRMS

> A modern, full-stack **Human Resource Management System** built for Odoo × NMIT, powering employee management, attendance tracking, leave workflows and payroll — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)

---

## Features

| Module | Description |
|---|---|
| 🔐 **Authentication** | Secure login & registration with NextAuth v5, role-based access (Admin / Employee) |
| 👥 **Employee Management** | Full employee profiles, department tracking, employment status and document storage |
| 🕐 **Attendance Tracking** | Daily check-in / check-out, worked hours calculation, attendance history |
| 🗓️ **Leave Management** | Leave requests, approval/rejection workflow, leave balances and leave types |
| 💰 **Payroll** | Salary structures with basic pay, HRA, allowances, PF, tax and net salary |
| 📊 **Dashboard** | Role-specific dashboards — admin overview and employee self-service view |
| 🛡️ **Activity Logs** | Audit trail of all key actions across the system |

---

## Tech Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** — App Router, Server Components, API Routes
- **[React 19](https://react.dev/)** — Latest stable with concurrent features
- **[TailwindCSS 4](https://tailwindcss.com/)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** — Accessible, composable component library
- **[TanStack Query](https://tanstack.com/query)** — Server state management & data fetching
- **[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)** — Form handling with schema validation
- **[Recharts](https://recharts.org/)** — Charts and data visualisation
- **[Lucide React](https://lucide.dev/)** — Icon library
- **[Sonner](https://sonner.emilkowal.ski/)** — Toast notifications

### Backend & Database
- **[NextAuth v5](https://authjs.dev/)** — Authentication with credential provider
- **[Prisma 7](https://www.prisma.io/)** — ORM with type-safe database access
- **[Neon PostgreSQL](https://neon.tech/)** — Serverless PostgreSQL database
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** — Password hashing

---

## Project Structure

```
dayflow/
├── app/
│   ├── (auth)/               # Login & Register pages
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Admin & employee home
│   │   ├── employees/        # Employee list & management
│   │   ├── attendance/       # Attendance tracking
│   │   ├── leave/            # Leave requests & approvals
│   │   ├── payroll/          # Payroll & salary details
│   │   ├── profile/          # Employee self-profile
│   │   └── admin/            # Admin-only panel
│   └── api/                  # REST API routes
│       ├── auth/             # Auth endpoints
│       ├── employees/        # Employee CRUD
│       ├── attendance/       # Check-in / check-out
│       ├── leave/            # Leave management
│       ├── payroll/          # Payroll endpoints
│       └── dashboard/        # Dashboard stats
├── components/
│   ├── layout/               # AppShell, Sidebar, Topbar
│   └── ui/                   # Reusable shadcn/ui components
├── lib/
│   ├── api/                  # API client utilities
│   ├── auth/                 # Auth helpers & permissions
│   ├── db/                   # Prisma client instance
│   ├── validations/          # Zod schemas
│   └── utils/                # Shared helpers
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Seed data
│   └── migrations/           # Migration history
├── hooks/                    # Custom React hooks
└── types/                    # Global TypeScript types
```

---

## Database Schema

```
User ──── Employee ──── Attendance
                    ├── LeaveRequest ──── LeaveType
                    ├── SalaryStructure
                    └── EmployeeDocument

User ──── ActivityLog
User ──── LeaveRequest (reviewer)
```

**Models:** `User`, `Employee`, `EmployeeDocument`, `Attendance`, `LeaveType`, `LeaveRequest`, `SalaryStructure`, `ActivityLog`

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech/) PostgreSQL database (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/ARUN-L-KUMAR/Odoo-x-NMIT-HRMS.git
cd Odoo-x-NMIT-HRMS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:push` | Push schema changes without migration |

---

## Roles & Permissions

| Feature | Admin | Employee |
|---|:---:|:---:|
| View all employees | ✅ | ❌ |
| Edit employee profiles | ✅ | ❌ |
| Approve / reject leaves | ✅ | ❌ |
| View admin dashboard | ✅ | ❌ |
| View own profile | ✅ | ✅ |
| Request leave | ✅ | ✅ |
| Check in / check out | ✅ | ✅ |
| View own payslip | ✅ | ✅ |

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

---

## License

This project was built as part of **Odoo × NMIT Hackathon**. All rights reserved.
