import { redirect } from "next/navigation";

// /leave is deprecated — all time-off is now at /time-off
export default function LeaveRedirectPage() {
  redirect("/time-off");
}
