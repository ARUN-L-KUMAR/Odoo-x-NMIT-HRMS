import "dotenv/config";
import { prisma } from "../lib/db";



async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, employeeId: true, role: true, mustChangePassword: true },
  });
  console.log("Users in DB:", users);

  // Reset demo / existing accounts so mustChangePassword is false
  await prisma.user.updateMany({
    data: { mustChangePassword: false },
  });
  console.log("Updated all users mustChangePassword to false");
}

main().finally(() => process.exit(0));
