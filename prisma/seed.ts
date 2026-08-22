import { PrismaClient, Role, AttendanceStatus, LeaveStatus, EmploymentStatus, NotificationType } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { subDays, startOfDay, addHours, addMinutes } from "date-fns";
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Starting safe upsert seed (preserving existing data)...");

  // ─── 1. Upsert Multi-Tenant Organizations ──────────────────────────────────

  async function upsertCompany(name: string, initials: string, logoUrl: string, notificationEmail: string) {
    const existing = await prisma.company.findFirst({
      where: { OR: [{ name }, { initials }] },
    });
    if (existing) {
      return prisma.company.update({
        where: { id: existing.id },
        data: { name, initials, logoUrl, notificationEmail },
      });
    }
    return prisma.company.create({
      data: { name, initials, logoUrl, notificationEmail },
    });
  }

  const dayflowCompany = await upsertCompany(
    "Dayflow Technologies",
    "DF",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    "larunkumar.co@gmail.com"
  );

  const apexCompany = await upsertCompany(
    "Apex Innovations",
    "AI",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150&auto=format&fit=crop&q=80",
    "larunkumar.co@gmail.com"
  );

  const techcorpCompany = await upsertCompany(
    "TechCorp Global",
    "TC",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80",
    "larunkumar.co@gmail.com"
  );

  console.log("✅ Organizations upserted and verified");

  // ─── 2. Upsert Leave Policies per Organization ─────────────────────────────

  const standardLeavePolicies = [
    { name: "Paid Time Off (PTO)", description: "Standard paid vacation days", isPaid: true, annualLimit: 18 },
    { name: "Sick Leave", description: "Medical and health-related leave", isPaid: true, annualLimit: 12 },
    { name: "Casual Leave", description: "Short planned personal time off", isPaid: true, annualLimit: 10 },
    { name: "Maternity / Paternity Leave", description: "Parental leave policy", isPaid: true, annualLimit: 90 },
    { name: "Unpaid Leave", description: "Leave without pay", isPaid: false, annualLimit: null },
  ];

  const orgLeaveTypes: Record<string, any[]> = {};

  for (const comp of [dayflowCompany, apexCompany, techcorpCompany]) {
    const list: any[] = [];
    for (const policy of standardLeavePolicies) {
      const existing = await prisma.leaveType.findFirst({
        where: { name: policy.name, companyId: comp.id },
      });
      if (existing) {
        list.push(existing);
      } else {
        const created = await prisma.leaveType.create({
          data: {
            ...policy,
            companyId: comp.id,
            isActive: true,
          },
        });
        list.push(created);
      }
    }
    orgLeaveTypes[comp.id] = list;
  }

  console.log("✅ Organization leave policies verified");

  // ─── 3. Upsert Super Admin ──────────────────────────────────────────────────

  const superAdminExisting = await prisma.user.findFirst({
    where: { OR: [{ employeeId: "SUPERADMIN" }, { email: "superadmin@dayflow.demo" }] },
    include: { employee: true },
  });

  let superAdminUser;
  if (superAdminExisting) {
    superAdminUser = await prisma.user.update({
      where: { id: superAdminExisting.id },
      data: {
        role: Role.SUPER_ADMIN,
        isActive: true,
        companyId: null,
      },
      include: { employee: true },
    });
  } else {
    superAdminUser = await prisma.user.create({
      data: {
        employeeId: "SUPERADMIN",
        email: "superadmin@dayflow.demo",
        passwordHash: await hashPassword("SuperAdmin@123"),
        role: Role.SUPER_ADMIN,
        isActive: true,
        companyId: null,
        employee: {
          create: {
            firstName: "Platform",
            lastName: "Super Admin",
            phone: "+91-9900000000",
            designation: "Executive Director",
            department: "Executive Management",
            joiningDate: new Date("2021-01-01"),
            employmentStatus: EmploymentStatus.ACTIVE,
            bankName: "HDFC Bank",
            bankAccountNumber: "50100482910394",
            bankIfsc: "HDFC0000123",
            panNumber: "SUPRAD1234S",
            uanNumber: "101999888777",
          },
        },
      },
      include: { employee: true },
    });
  }

  console.log("✅ Super Admin verified (SUPERADMIN / SuperAdmin@123)");

  // ─── 4. Upsert Employees & Salary Structures ────────────────────────────────

  interface EmployeeSeedDef {
    companyId: string;
    employeeId: string;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
    phone: string;
    designation: string;
    department: string;
    joiningDate: Date;
    avatar?: string;
    bankName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    panNumber: string;
    uanNumber: string;
    basic: number;
    hra: number;
    standard: number;
    bonus: number;
    lta: number;
    fixed: number;
  }

  const employeeDefs: EmployeeSeedDef[] = [
    // ── Dayflow Technologies ──
    {
      companyId: dayflowCompany.id,
      employeeId: "ADM001",
      email: "admin@dayflow.demo",
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "User",
      phone: "+91-9800000001",
      designation: "HR Manager",
      department: "Human Resources",
      joiningDate: new Date("2022-01-01"),
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100482910391",
      bankIfsc: "HDFC0000123",
      panNumber: "ADMDF1234A",
      uanNumber: "101293847501",
      basic: 45000,
      hra: 22500,
      standard: 7500,
      bonus: 5000,
      lta: 5000,
      fixed: 5000,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP001",
      email: "arun@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Arun",
      lastName: "Kumar",
      phone: "+91-9811111111",
      designation: "Senior Software Engineer",
      department: "Engineering",
      joiningDate: new Date("2023-03-15"),
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100482910392",
      bankIfsc: "HDFC0000123",
      panNumber: "AKLMN1234K",
      uanNumber: "101293847502",
      basic: 40000,
      hra: 20000,
      standard: 6667,
      bonus: 3333,
      lta: 3333,
      fixed: 6667,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP002",
      email: "priya@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+91-9822222222",
      designation: "Lead Product Designer",
      department: "Design",
      joiningDate: new Date("2023-06-01"),
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      bankName: "ICICI Bank",
      bankAccountNumber: "001105029384",
      bankIfsc: "ICIC0000011",
      panNumber: "PSHMR5678P",
      uanNumber: "101293847503",
      basic: 42000,
      hra: 21000,
      standard: 7000,
      bonus: 3500,
      lta: 3500,
      fixed: 3000,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP003",
      email: "rahul@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Rahul",
      lastName: "Kumar",
      phone: "+91-9833333333",
      designation: "Principal Architect",
      department: "Engineering",
      joiningDate: new Date("2022-09-10"),
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      bankName: "State Bank of India",
      bankAccountNumber: "203948571029",
      bankIfsc: "SBIN0001234",
      panNumber: "RKMRR9012R",
      uanNumber: "101293847504",
      basic: 60000,
      hra: 30000,
      standard: 10000,
      bonus: 5000,
      lta: 5000,
      fixed: 5000,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP004",
      email: "sneha@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Sneha",
      lastName: "Raj",
      phone: "+91-9844444444",
      designation: "Growth Marketing Specialist",
      department: "Marketing",
      joiningDate: new Date("2024-01-20"),
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      bankName: "Axis Bank",
      bankAccountNumber: "91802004829103",
      bankIfsc: "UTIB0000918",
      panNumber: "SRJXX3456S",
      uanNumber: "101293847505",
      basic: 32000,
      hra: 16000,
      standard: 5333,
      bonus: 2667,
      lta: 2667,
      fixed: 1333,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP005",
      email: "karthik@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Karthik",
      lastName: "M",
      phone: "+91-9855555555",
      designation: "DevOps & Cloud Engineer",
      department: "Engineering",
      joiningDate: new Date("2023-11-05"),
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100482910396",
      bankIfsc: "HDFC0000123",
      panNumber: "KMNNN7890K",
      uanNumber: "101293847506",
      basic: 48000,
      hra: 24000,
      standard: 8000,
      bonus: 4000,
      lta: 4000,
      fixed: 2000,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP006",
      email: "ananya@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Ananya",
      lastName: "Verma",
      phone: "+91-9866666666",
      designation: "Financial Analyst",
      department: "Finance",
      joiningDate: new Date("2023-08-10"),
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      bankName: "ICICI Bank",
      bankAccountNumber: "001105029399",
      bankIfsc: "ICIC0000011",
      panNumber: "AVRMA4321A",
      uanNumber: "101293847507",
      basic: 38000,
      hra: 19000,
      standard: 6333,
      bonus: 3167,
      lta: 3167,
      fixed: 2333,
    },
    {
      companyId: dayflowCompany.id,
      employeeId: "EMP007",
      email: "vikram@dayflow.demo",
      role: Role.EMPLOYEE,
      firstName: "Vikram",
      lastName: "Singhania",
      phone: "+91-9877777777",
      designation: "Enterprise Account Executive",
      department: "Sales",
      joiningDate: new Date("2023-05-18"),
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      bankName: "State Bank of India",
      bankAccountNumber: "203948571099",
      bankIfsc: "SBIN0001234",
      panNumber: "VSING8765V",
      uanNumber: "101293847508",
      basic: 45000,
      hra: 22500,
      standard: 7500,
      bonus: 5000,
      lta: 5000,
      fixed: 5000,
    },

    // ── Apex Innovations ──
    {
      companyId: apexCompany.id,
      employeeId: "AIADM001",
      email: "admin@apex.demo",
      role: Role.ADMIN,
      firstName: "Ramesh",
      lastName: "Patel",
      phone: "+91-9800000002",
      designation: "Operations Director",
      department: "Operations",
      joiningDate: new Date("2022-04-10"),
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100482910401",
      bankIfsc: "HDFC0000123",
      panNumber: "RPATL1234R",
      uanNumber: "101293847601",
      basic: 52000,
      hra: 26000,
      standard: 8667,
      bonus: 4333,
      lta: 4333,
      fixed: 4667,
    },
    {
      companyId: apexCompany.id,
      employeeId: "AIEMP001",
      email: "neha@apex.demo",
      role: Role.EMPLOYEE,
      firstName: "Neha",
      lastName: "Gupta",
      phone: "+91-9811111112",
      designation: "AI Research Scientist",
      department: "AI Research",
      joiningDate: new Date("2023-07-01"),
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      bankName: "ICICI Bank",
      bankAccountNumber: "001105029411",
      bankIfsc: "ICIC0000011",
      panNumber: "NGPTA5678N",
      uanNumber: "101293847602",
      basic: 58000,
      hra: 29000,
      standard: 9667,
      bonus: 4833,
      lta: 4833,
      fixed: 3667,
    },
    {
      companyId: apexCompany.id,
      employeeId: "AIEMP002",
      email: "rohit@apex.demo",
      role: Role.EMPLOYEE,
      firstName: "Rohit",
      lastName: "Nair",
      phone: "+91-9822222223",
      designation: "Cloud Systems Engineer",
      department: "Engineering",
      joiningDate: new Date("2023-10-15"),
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      bankName: "Axis Bank",
      bankAccountNumber: "91802004829122",
      bankIfsc: "UTIB0000918",
      panNumber: "RNAIR9012R",
      uanNumber: "101293847603",
      basic: 44000,
      hra: 22000,
      standard: 7333,
      bonus: 3667,
      lta: 3667,
      fixed: 3333,
    },

    // ── TechCorp Global ──
    {
      companyId: techcorpCompany.id,
      employeeId: "TCADM001",
      email: "admin@techcorp.demo",
      role: Role.ADMIN,
      firstName: "Sunita",
      lastName: "Deshmukh",
      phone: "+91-9800000003",
      designation: "VP of People & Culture",
      department: "Human Resources",
      joiningDate: new Date("2021-11-01"),
      avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
      bankName: "HDFC Bank",
      bankAccountNumber: "50100482910501",
      bankIfsc: "HDFC0000123",
      panNumber: "SDSHM1234S",
      uanNumber: "101293847701",
      basic: 65000,
      hra: 32500,
      standard: 10833,
      bonus: 5417,
      lta: 5417,
      fixed: 5833,
    },
    {
      companyId: techcorpCompany.id,
      employeeId: "TCEMP001",
      email: "deepak@techcorp.demo",
      role: Role.EMPLOYEE,
      firstName: "Deepak",
      lastName: "Rao",
      phone: "+91-9811111113",
      designation: "Cybersecurity Specialist",
      department: "Security",
      joiningDate: new Date("2023-04-12"),
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
      bankName: "State Bank of India",
      bankAccountNumber: "203948571122",
      bankIfsc: "SBIN0001234",
      panNumber: "DRAOO5678D",
      uanNumber: "101293847702",
      basic: 46000,
      hra: 23000,
      standard: 7667,
      bonus: 3833,
      lta: 3833,
      fixed: 3667,
    },
  ];

  for (const def of employeeDefs) {
    const gross = def.basic + def.hra + def.standard + def.bonus + def.lta + def.fixed;
    const employeePf = Math.round(def.basic * 0.12);
    const employerPf = Math.round(def.basic * 0.12);
    const pt = 200;
    const tax = Math.round(gross > 75000 ? gross * 0.1 : 500);
    const deductions = employeePf + pt + tax;
    const net = Math.max(0, gross - deductions);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ employeeId: def.employeeId }, { email: def.email }] },
      include: { employee: true },
    });

    if (existingUser) {
      // Update employee and salary structure
      const emp = existingUser.employee;
      if (emp) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            companyId: def.companyId,
            firstName: def.firstName,
            lastName: def.lastName,
            designation: def.designation,
            department: def.department,
            phone: def.phone,
            bankName: def.bankName,
            bankAccountNumber: def.bankAccountNumber,
            bankIfsc: def.bankIfsc,
            panNumber: def.panNumber,
            uanNumber: def.uanNumber,
            profileImage: def.avatar || emp.profileImage,
          },
        });

        await prisma.salaryStructure.upsert({
          where: { employeeId: emp.id },
          update: {
            basicSalary: def.basic,
            hra: def.hra,
            standardAllowance: def.standard,
            performanceBonus: def.bonus,
            leaveTravelAllowance: def.lta,
            fixedAllowance: def.fixed,
            grossSalary: gross,
            monthlyWage: gross,
            yearlyWage: gross * 12,
            employeePf,
            employerPf,
            professionalTax: pt,
            tax,
            deductions,
            netSalary: net,
            workingDaysPerWeek: 5,
            workingHoursPerDay: 8,
            breakTimeHours: 1,
          },
          create: {
            employeeId: emp.id,
            basicSalary: def.basic,
            hra: def.hra,
            standardAllowance: def.standard,
            performanceBonus: def.bonus,
            leaveTravelAllowance: def.lta,
            fixedAllowance: def.fixed,
            grossSalary: gross,
            monthlyWage: gross,
            yearlyWage: gross * 12,
            employeePf,
            employerPf,
            professionalTax: pt,
            tax,
            deductions,
            netSalary: net,
            workingDaysPerWeek: 5,
            workingHoursPerDay: 8,
            breakTimeHours: 1,
            effectiveFrom: def.joiningDate,
          },
        });
      }
    } else {
      // Create new user, employee and salary structure
      await prisma.user.create({
        data: {
          employeeId: def.employeeId,
          email: def.email,
          passwordHash: await hashPassword(def.role === Role.ADMIN ? "Admin@123" : "Employee@123"),
          role: def.role,
          isActive: true,
          companyId: def.companyId,
          employee: {
            create: {
              companyId: def.companyId,
              firstName: def.firstName,
              lastName: def.lastName,
              phone: def.phone,
              designation: def.designation,
              department: def.department,
              joiningDate: def.joiningDate,
              employmentStatus: EmploymentStatus.ACTIVE,
              profileImage: def.avatar,
              bankName: def.bankName,
              bankAccountNumber: def.bankAccountNumber,
              bankIfsc: def.bankIfsc,
              panNumber: def.panNumber,
              uanNumber: def.uanNumber,
              salaryStructure: {
                create: {
                  basicSalary: def.basic,
                  hra: def.hra,
                  standardAllowance: def.standard,
                  performanceBonus: def.bonus,
                  leaveTravelAllowance: def.lta,
                  fixedAllowance: def.fixed,
                  grossSalary: gross,
                  monthlyWage: gross,
                  yearlyWage: gross * 12,
                  employeePf,
                  employerPf,
                  professionalTax: pt,
                  tax,
                  deductions,
                  netSalary: net,
                  workingDaysPerWeek: 5,
                  workingHoursPerDay: 8,
                  breakTimeHours: 1,
                  effectiveFrom: def.joiningDate,
                },
              },
            },
          },
        },
      });
    }
  }

  console.log(`✅ ${employeeDefs.length} employee records and salary structures safely verified`);

  // ─── 5. Populate attendance logs for any missing shifts ─────────────────────

  const allEmployees = await prisma.employee.findMany({ select: { id: true } });
  const today = startOfDay(new Date());

  for (const emp of allEmployees) {
    const existingCount = await prisma.attendance.count({ where: { employeeId: emp.id } });
    if (existingCount < 5) {
      for (let i = 1; i <= 20; i++) {
        const date = subDays(today, i);
        const dayOfWeek = date.getDay();
        const checkIn = addMinutes(addHours(date, 9), Math.floor(Math.random() * 20));
        const checkOut = addMinutes(addHours(date, 17), 30 + Math.floor(Math.random() * 30));

        await prisma.attendance.upsert({
          where: {
            employeeId_attendanceDate: {
              employeeId: emp.id,
              attendanceDate: date,
            },
          },
          update: {},
          create: {
            employeeId: emp.id,
            attendanceDate: date,
            checkIn,
            checkOut,
            status: AttendanceStatus.PRESENT,
            workedMinutes: 480,
          },
        });
      }
    }
  }

  console.log("✅ Attendance shift records verified");

  // ─── 6. Populate realistic Leave Requests ──────────────────────────────────

  const allEmpRecords = await prisma.employee.findMany({
    include: { company: true },
  });

  for (const emp of allEmpRecords) {
    if (!emp.companyId) continue;
    const leaveList = orgLeaveTypes[emp.companyId];
    if (!leaveList || leaveList.length === 0) continue;

    const existingLeaveCount = await prisma.leaveRequest.count({
      where: { employeeId: emp.id },
    });

    if (existingLeaveCount === 0) {
      // 1 approved past leave
      const pastStart = subDays(today, 12);
      const pastEnd = subDays(today, 11);
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveList[0].id,
          startDate: pastStart,
          endDate: pastEnd,
          totalDays: 2,
          reason: "Family personal commitment",
          status: LeaveStatus.APPROVED,
          reviewedAt: subDays(today, 14),
        },
      });

      // 1 pending upcoming leave
      const futureStart = subDays(today, -5);
      const futureEnd = subDays(today, -6);
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveList[1]?.id || leaveList[0].id,
          startDate: futureStart,
          endDate: futureEnd,
          totalDays: 1,
          reason: "Routine medical checkup",
          status: LeaveStatus.PENDING,
        },
      });
    }
  }

  console.log("✅ Leave requests verified");

  // ─── 7. Populate realistic Notification Alerts ─────────────────────────────

  for (const emp of allEmpRecords) {
    const user = await prisma.user.findFirst({ where: { employee: { id: emp.id } } });
    if (!user) continue;

    const notifCount = await prisma.notification.count({ where: { userId: user.id } });
    if (notifCount === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: user.id,
            companyId: emp.companyId,
            title: "Payslip Ready for August 2026",
            message: "Your monthly compensation and salary breakdown have been confirmed.",
            type: NotificationType.PAYROLL,
            link: "/payroll",
            isRead: false,
          },
          {
            userId: user.id,
            companyId: emp.companyId,
            title: "Attendance Record Verified",
            message: "Your recent shift duration was verified successfully.",
            type: NotificationType.ATTENDANCE,
            link: "/attendance",
            isRead: true,
          },
        ],
      });
    }
  }

  console.log("✅ Notification alerts verified");

  console.log("\n🎉 Safe Seed Completed Successfully! All existing records preserved.");
  console.log("──────────────────────────────────────────────────────────────────────────");
  console.log("👑 Super Admin (All Organizations Switcher):");
  console.log("   Login ID: SUPERADMIN  |  Email: superadmin@dayflow.demo  |  Password: SuperAdmin@123");
  console.log("\n🏢 Dayflow Technologies Admin:");
  console.log("   Login ID: ADM001      |  Email: admin@dayflow.demo       |  Password: Admin@123");
  console.log("👤 Dayflow Technologies Employee:");
  console.log("   Login ID: EMP001      |  Email: arun@dayflow.demo        |  Password: Employee@123");
  console.log("\n🏢 Apex Innovations Admin:");
  console.log("   Login ID: AIADM001    |  Email: admin@apex.demo          |  Password: Admin@123");
  console.log("👤 Apex Innovations Employee:");
  console.log("   Login ID: AIEMP001    |  Email: neha@apex.demo           |  Password: Employee@123");
  console.log("\n🏢 TechCorp Global Admin:");
  console.log("   Login ID: TCADM001    |  Email: admin@techcorp.demo      |  Password: Admin@123");
  console.log("──────────────────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
