import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushTo } from "@/lib/push";
import type { SwapRequest } from "@/types/database";

// Target accepteert (of weigert) het ruilverzoek.
// Na accept: status wordt 'pending_admin' — admin moet daarna definitief goedkeuren.
// Na reject: status 'rejected'.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const accept = Boolean(body.accept);

  const db = supabaseAdmin();
  const existing = await db
    .from("rooster_swap_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle<SwapRequest>();

  if (!existing.data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (existing.data.target_id !== user.employeeId) {
    return NextResponse.json({ error: "Niet jouw verzoek" }, { status: 403 });
  }
  if (existing.data.status !== "pending_target") {
    return NextResponse.json({ error: "Niet meer aan te passen" }, { status: 400 });
  }

  const { data, error } = await db
    .from("rooster_swap_requests")
    .update({
      status: accept ? "pending_admin" : "rejected",
      target_accepted_at: accept ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single<SwapRequest>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data) {
    sendPushTo([data.requester_id], {
      title: accept ? "Ruilverzoek geaccepteerd" : "Ruilverzoek afgewezen",
      body: accept
        ? "Je collega gaat akkoord. Suzan beoordeelt het nu."
        : "Je collega kan niet ruilen.",
      url: "/ruilen",
    }).catch(() => {});
  }

  return NextResponse.json({ request: data });
}
