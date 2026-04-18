import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  LeaveRequest,
  SwapRequest,
  Employee,
  Shift,
} from "@/types/database";
import { AanvragenClient } from "@/components/admin/AanvragenClient";

export const dynamic = "force-dynamic";

export default async function AanvragenPage() {
  const admin = supabaseAdmin();

  const [leaveRes, swapRes, empRes, shiftsRes] = await Promise.all([
    admin
      .from("rooster_leave_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<LeaveRequest[]>(),
    admin
      .from("rooster_swap_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SwapRequest[]>(),
    admin
      .from("rooster_employees")
      .select("*")
      .returns<Employee[]>(),
    admin.from("rooster_shifts").select("*").returns<Shift[]>(),
  ]);

  return (
    <AanvragenClient
      leaveRequests={leaveRes.data ?? []}
      swapRequests={swapRes.data ?? []}
      employees={empRes.data ?? []}
      shifts={shiftsRes.data ?? []}
    />
  );
}
