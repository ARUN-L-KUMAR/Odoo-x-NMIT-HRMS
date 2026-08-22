import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EmployeeDashboardPage from "./employee-dashboard";
import AdminDashboardPage from "./admin-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  return isAdmin ? <AdminDashboardPage /> : <EmployeeDashboardPage />;
}
