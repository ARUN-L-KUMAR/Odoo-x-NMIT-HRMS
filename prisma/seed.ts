// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient, Role, AttendanceStatus, LeaveStatus, EmploymentStatus } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaNeon } = require("@prisma/adapter-neon");
import bcrypt from "bcryptjs";
import { subDays, startOfDay, addHours, addMinutes, format } from "date-fns";
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });



async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data
  await prisma.activityLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Cleaned existing data");

  // ─── Leave Types ──────────────────────────────────────────────────────────

  const leaveTypes = await Promise.all([
    prisma.leaveType.create({
      data: {
        name: "Paid Leave",
        description: "Annual paid leave",
        isPaid: true,
        annualLimit: 12,
        isActive: true,
      },
    }),
    prisma.leaveType.create({
      data: {
        name: "Sick Leave",
        description: "Medical / sick leave",
        isPaid: true,
        annualLimit: 6,
        isActive: true,
      },
    }),
    prisma.leaveType.create({
      data: {
        name: "Unpaid Leave",
        description: "Leave without pay",
        isPaid: false,
        annualLimit: null,
        isActive: true,
      },
    }),
  ]);

  const [paidLeave, sickLeave, unpaidLeave] = leaveTypes;
  console.log("✅ Leave types created");

  // ─── Admin ────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.create({
    data: {
      employeeId: "ADM001",
      email: "admin@dayflow.demo",
      passwordHash: await hashPassword("Admin@123"),
      role: Role.ADMIN,
      isActive: true,
      employee: {
        create: {
          firstName: "Admin",
          lastName: "User",
          phone: "+91-9000000000",
          designation: "HR Manager",
          department: "Human Resources",
          joiningDate: new Date("2022-01-01"),
          employmentStatus: EmploymentStatus.ACTIVE,
        },
      },
    },
    include: { employee: true },
  });

  console.log("✅ Admin created");

  // ─── Employees ────────────────────────────────────────────────────────────

  const employeeDefs = [
    {
      employeeId: "EMP001",
      email: "arun@dayflow.demo",
      password: "Employee@123",
      firstName: "Arun",
      lastName: "Kumar",
      phone: "+91-9811111111",
      designation: "Software Engineer",
      department: "Engineering",
      joiningDate: new Date("2023-03-15"),
      basic: 35000,
      hra: 14000,
      allowances: 5000,
      deductions: 3000,
      pf: 1800,
      tax: 900,
    },
    {
      employeeId: "EMP002",
      email: "priya@dayflow.demo",
      password: "Employee@123",
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+91-9822222222",
      designation: "Product Designer",
      department: "Design",
      joiningDate: new Date("2023-06-01"),
      basic: 40000,
      hra: 16000,
      allowances: 6000,
      deductions: 3500,
      pf: 2100,
      tax: 1200,
    },
    {
      employeeId: "EMP003",
      email: "rahul@dayflow.demo",
      password: "Employee@123",
      firstName: "Rahul",
      lastName: "Kumar",
      phone: "+91-9833333333",
      designation: "Senior Developer",
      department: "Engineering",
      joiningDate: new Date("2022-09-10"),
      basic: 55000,
      hra: 22000,
      allowances: 8000,
      deductions: 5000,
      pf: 3000,
      tax: 2500,
    },
    {
      employeeId: "EMP004",
      email: "sneha@dayflow.demo",
      password: "Employee@123",
      firstName: "Sneha",
      lastName: "Raj",
      phone: "+91-9844444444",
      designation: "Marketing Specialist",
      department: "Marketing",
      joiningDate: new Date("2024-01-20"),
      basic: 30000,
      hra: 12000,
      allowances: 4000,
      deductions: 2500,
      pf: 1500,
      tax: 700,
    },
    {
      employeeId: "EMP005",
      email: "karthik@dayflow.demo",
      password: "Employee@123",
      firstName: "Karthik",
      lastName: "M",
      phone: "+91-9855555555",
      designation: "DevOps Engineer",
      department: "Engineering",
      joiningDate: new Date("2023-11-05"),
      basic: 45000,
      hra: 18000,
      allowances: 7000,
      deductions: 4000,
      pf: 2400,
      tax: 1500,
    },
  ];

  const createdEmployees: { user: typeof adminUser; employee: NonNullable<typeof adminUser.employee> }[] = [];

  for (const def of employeeDefs) {
    const gross = def.basic + def.hra + def.allowances;
    const net = gross - def.deductions - def.pf - def.tax;

    const user = await prisma.user.create({
      data: {
        employeeId: def.employeeId,
        email: def.email,
        passwordHash: await hashPassword(def.password),
        role: Role.EMPLOYEE,
        isActive: true,
        employee: {
          create: {
            firstName: def.firstName,
            lastName: def.lastName,
            phone: def.phone,
            designation: def.designation,
            department: def.department,
            joiningDate: def.joiningDate,
            employmentStatus: EmploymentStatus.ACTIVE,
            salaryStructure: {
              create: {
                basicSalary: def.basic,
                hra: def.hra,
                allowances: def.allowances,
                deductions: def.deductions,
                pf: def.pf,
                tax: def.tax,
                grossSalary: gross,
                netSalary: net,
                effectiveFrom: def.joiningDate,
              },
            },
          },
        },
      },
      include: { employee: { include: { salaryStructure: true } } },
    });

    createdEmployees.push({ user, employee: user.employee! });
  }

  console.log("✅ Employees and salaries created");

  // ─── Attendance (last 14 days) ────────────────────────────────────────────

  const attendanceStatuses: string[] = [
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.HALF_DAY,
    AttendanceStatus.ABSENT,
  ];

  const today = startOfDay(new Date());

  for (const { employee } of createdEmployees) {
    for (let i = 1; i <= 14; i++) {
      const date = subDays(today, i);
      const dayOfWeek = date.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const status = attendanceStatuses[i % attendanceStatuses.length];
      const checkIn =
        status !== AttendanceStatus.ABSENT
          ? addMinutes(addHours(date, 9), Math.floor(Math.random() * 30))
          : null;
      const checkOut =
        status === AttendanceStatus.PRESENT && checkIn
          ? addMinutes(addHours(date, 17), Math.floor(Math.random() * 60))
          : status === AttendanceStatus.HALF_DAY && checkIn
          ? addMinutes(addHours(date, 13), Math.floor(Math.random() * 30))
          : null;

      const workedMinutes =
        checkIn && checkOut
          ? Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
          : 0;

      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          attendanceDate: date,
          checkIn,
          checkOut,
          workedMinutes,
          status,
        },
      });
    }
  }

  // Today attendance for first employee (Arun) — already checked in
  const arunEmployee = createdEmployees[0].employee;
  const todayCheckIn = addMinutes(addHours(today, 9), 5);
  await prisma.attendance.create({
    data: {
      employeeId: arunEmployee.id,
      attendanceDate: today,
      checkIn: todayCheckIn,
      checkOut: null,
      workedMinutes: 0,
      status: AttendanceStatus.PRESENT,
    },
  });

  console.log("✅ Attendance records created");

  // ─── Leave Requests ───────────────────────────────────────────────────────

  const nextWeek = subDays(today, -7);
  const twoWeeks = subDays(today, -14);

  // Arun — Pending leave (for demo workflow)
  const arunLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: arunEmployee.id,
      leaveTypeId: paidLeave.id,
      startDate: nextWeek,
      endDate: subDays(nextWeek, -1),
      totalDays: 2,
      reason: "Personal work and family commitment",
      status: LeaveStatus.PENDING,
    },
  });

  // Priya — Approved leave
  const priyaEmployee = createdEmployees[1].employee;
  await prisma.leaveRequest.create({
    data: {
      employeeId: priyaEmployee.id,
      leaveTypeId: sickLeave.id,
      startDate: subDays(today, 3),
      endDate: subDays(today, 3),
      totalDays: 1,
      reason: "Fever and cold",
      status: LeaveStatus.APPROVED,
      reviewedBy: adminUser.id,
      reviewedAt: subDays(today, 4),
      adminComment: "Get well soon! Take care.",
    },
  });

  // Mark Priya's attendance as LEAVE
  const priyaAttendance = await prisma.attendance.findFirst({
    where: {
      employeeId: priyaEmployee.id,
      attendanceDate: subDays(today, 3),
    },
  });

  if (priyaAttendance) {
    await prisma.attendance.update({
      where: { id: priyaAttendance.id },
      data: { status: AttendanceStatus.LEAVE },
    });
  }

  // Rahul — Rejected leave
  const rahulEmployee = createdEmployees[2].employee;
  await prisma.leaveRequest.create({
    data: {
      employeeId: rahulEmployee.id,
      leaveTypeId: unpaidLeave.id,
      startDate: twoWeeks,
      endDate: twoWeeks,
      totalDays: 1,
      reason: "Personal emergency",
      status: LeaveStatus.REJECTED,
      reviewedBy: adminUser.id,
      reviewedAt: subDays(twoWeeks, 1),
      adminComment: "Cannot be approved due to critical project deadline.",
    },
  });

  // Sneha — Another pending leave
  const snehaEmployee = createdEmployees[3].employee;
  await prisma.leaveRequest.create({
    data: {
      employeeId: snehaEmployee.id,
      leaveTypeId: paidLeave.id,
      startDate: subDays(today, -3),
      endDate: subDays(today, -5),
      totalDays: 3,
      reason: "Vacation trip planned with family",
      status: LeaveStatus.PENDING,
    },
  });

  console.log("✅ Leave requests created");

  // ─── Activity Logs ────────────────────────────────────────────────────────

  const activityEntries = [
    {
      userId: createdEmployees[0].user.id,
      action: "EMPLOYEE_CHECKED_IN",
      entityType: "attendance",
      description: `Arun Kumar checked in at 09:05 AM`,
      createdAt: addMinutes(addHours(today, 9), 5),
    },
    {
      userId: createdEmployees[1].user.id,
      action: "LEAVE_APPLIED",
      entityType: "leave",
      description: "Priya Sharma submitted a Sick Leave request",
      createdAt: subDays(today, 4),
    },
    {
      userId: adminUser.id,
      action: "LEAVE_APPROVED",
      entityType: "leave",
      description: "Admin approved Priya Sharma's Sick Leave",
      createdAt: subDays(today, 4),
    },
    {
      userId: createdEmployees[0].user.id,
      action: "LEAVE_APPLIED",
      entityType: "leave",
      description: "Arun Kumar submitted a Paid Leave request",
      createdAt: subDays(today, 1),
    },
    {
      userId: adminUser.id,
      action: "SALARY_UPDATED",
      entityType: "salary",
      description: "Admin updated Rahul Kumar's salary structure",
      createdAt: subDays(today, 5),
    },
    {
      userId: adminUser.id,
      action: "EMPLOYEE_CREATED",
      entityType: "employee",
      description: "Admin created employee Karthik M (EMP005)",
      createdAt: subDays(today, 10),
    },
    {
      userId: createdEmployees[2].user.id,
      action: "EMPLOYEE_CHECKED_IN",
      entityType: "attendance",
      description: "Rahul Kumar checked in at 09:15 AM",
      createdAt: subDays(today, 1),
    },
    {
      userId: createdEmployees[2].user.id,
      action: "EMPLOYEE_CHECKED_OUT",
      entityType: "attendance",
      description: "Rahul Kumar checked out at 06:30 PM",
      createdAt: subDays(today, 1),
    },
  ];

  for (const entry of activityEntries) {
    await prisma.activityLog.create({ data: entry });
  }

  console.log("✅ Activity logs created");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Demo Accounts:");
  console.log("   Admin:    admin@dayflow.demo  / Admin@123");
  console.log("   Employee: arun@dayflow.demo   / Employee@123");
  console.log("   Employee: priya@dayflow.demo  / Employee@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
