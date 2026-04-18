import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushTo } from "@/lib/push";
import type { LeaveRequest } from "@/types/database";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin_user = await requireAdmin().catch(() => null);
  if (!admin_user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: leave, error } = await db
    .from("rooster_leave_requests")
    .update({
      status: body.status,
      reviewed_by: admin_user.employeeId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<LeaveRequest>();

  if (error || !leave) {
    return NextResponse.json({ error: error?.message ?? "Niet gevonden" }, { status: 400 });
  }

  // Bij goedkeuring: verwijder bestaande shifts van deze medewerker op die datum
  // in alle bestaande roosters (draft én published).
  if (body.status === "approved") {
    await db
      .from("rooster_shifts")
      .delete()
      .eq("employee_id", leave.employee_id)
      .eq("date", leave.date);
  }

  const dateLabel = new Date(`${leave.date}T00:00:00`).toLocaleDateString(
    "nl-NL",
    { day: "numeric", month: "long" },
  );
  sendPushTo([leave.employee_id], {
    title:
      body.status === "approved"
        ? "Verlof goedgekeurd"
        : "Verlof afgewezen",
    body: `Je aanvraag voor ${dateLabel} is ${body.status === "approved" ? "goedgekeurd" : "afgewezen"}.`,
    url: "/verlof",
  }).catch(() => {});

  return NextResponse.json({ request: leave });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = supabaseAdmin();

  // Medewerker mag alleen eigen pending aanvragen intrekken.
  if (!user.isAdmin) {
    const { data } = await db
      .from("rooster_leave_requests")
      .select("employee_id, status")
      .eq("id", id)
      .maybeSingle<Pick<LeaveRequest, "employee_id" | "status">>();
    if (!data || data.employee_id !== user.employeeId || data.status !== "pending") {
      return NextResponse.json({ error: "Niet toegestaan" }, { status: 403 });
    }
  }

  const { error } = await db.from("rooster_leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
