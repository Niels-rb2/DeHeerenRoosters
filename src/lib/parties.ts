import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PrivateEventRequest } from "@/types/database";

// Feestjes = rijen uit de bestaande `private_event_requests` tabel
// (beheerd door het Kanban Board project).
// Statussen die "doorgaan": CONSULTATION_PLANNED, GO.
// NO_GO, ARCHIVE en TO_ANSWER/ANSWERED slaan we over.
const RELEVANT_STATUSES = ["CONSULTATION_PLANNED", "GO"];

export type PartyDisplay = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // contactpersoon
  occasion_type: string | null;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
};

export async function getPartiesInRange(
  fromIso: string,
  toIso: string,
): Promise<PartyDisplay[]> {
  const { data } = await supabaseAdmin()
    .from("private_event_requests")
    .select("id, sender_name, occasion_type, event_date, start_time, end_time, guest_count, status")
    .gte("event_date", fromIso)
    .lte("event_date", toIso)
    .in("status", RELEVANT_STATUSES)
    .returns<PrivateEventRequest[]>();

  return (data ?? [])
    .filter((p) => p.event_date)
    .map((p) => ({
      id: p.id,
      date: p.event_date!,
      title: p.sender_name || "Besloten feestje",
      occasion_type: p.occasion_type,
      start_time: p.start_time,
      end_time: p.end_time,
      guest_count: p.guest_count,
    }));
}
