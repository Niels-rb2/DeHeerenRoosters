import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeaveRequest } from "@/types/database";
import { LeaveRequestsClient } from "@/components/employee/LeaveRequestsClient";

export const dynamic = "force-dynamic";

export default async function VerlofPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/login");

  const { data } = await supabaseAdmin()
    .from("rooster_leave_requests")
    .select("*")
    .eq("employee_id", session.user.employeeId)
    .order("date", { ascending: false })
    .returns<LeaveRequest[]>();

  return <LeaveRequestsClient initial={data ?? []} />;
}
