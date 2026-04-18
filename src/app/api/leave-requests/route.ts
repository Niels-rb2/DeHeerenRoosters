import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeaveRequest } from "@/types/database";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = supabaseAdmin()
    .from("rooster_leave_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (!user.isAdmin) q.eq("employee_id", user.employeeId!);

  const { data, error } = await q.returns<LeaveRequest[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Datum is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("rooster_leave_requests")
    .insert({
      employee_id: user.employeeId,
      date: body.date,
      reason: body.reason?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single<LeaveRequest>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ request: data });
}
