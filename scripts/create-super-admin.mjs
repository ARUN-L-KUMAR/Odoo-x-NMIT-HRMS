import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function createSuperAdmin() {
  console.log("Creating Super Admin credential...");

  // Find or pick first company
  const company = await prisma.company.findFirst();

  const passwordHash = await bcrypt.hash("SuperAdmin@123", 12);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "superadmin@dayflow.demo" },
        { employeeId: "SUPER001" },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "SUPER_ADMIN",
        passwordHash,
        isActive: true,
        companyId: company?.id || null,
      },
    });
    console.log("✅ Super Admin updated successfully:", updated.email);
  } else {
    const created = await prisma.user.create({
      data: {
        employeeId: "SUPER001",
        email: "superadmin@dayflow.demo",
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
        companyId: company?.id || null,
        employee: {
          create: {
            firstName: "Super",
            lastName: "Administrator",
            phone: "+91-9999999999",
            designation: "Platform Super Admin",
            department: "Executive",
            joiningDate: new Date(),
            employmentStatus: "ACTIVE",
            companyId: company?.id || null,
          },
        },
      },
    });
    console.log("✅ Super Admin created successfully:", created.email);
  }
}

createSuperAdmin()
  .catch((e) => {
    console.error("❌ Failed to create super admin:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
