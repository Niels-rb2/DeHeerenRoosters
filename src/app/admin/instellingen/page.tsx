import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EventKeyword } from "@/types/database";
import { EventKeywordsClient } from "@/components/admin/EventKeywordsClient";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  const { data } = await supabaseAdmin()
    .from("rooster_event_keywords")
    .select("*")
    .order("keyword", { ascending: true })
    .returns<EventKeyword[]>();

  const calendarConnected = !!process.env.GOOGLE_CALENDAR_SA_JSON;

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10 py-8 md:py-12 space-y-12">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">Instellingen</h1>
      </div>

      <section>
        <h2 className="text-lg font-medium">Google Agenda — termen</h2>
        <p className="mt-2 text-sm text-[color:var(--clr-text-muted)]">
          Alleen agenda-items waarvan de titel één van deze termen bevat
          worden in het rooster getoond. Hiermee filter je persoonlijke
          afspraken en leveranciers weg.
        </p>

        {!calendarConnected ? (
          <div className="mt-4 rounded-xl bg-[color:var(--clr-warning)]/15 text-[color:var(--clr-warning)] px-4 py-3 text-sm">
            Google Agenda is nog niet gekoppeld. Zet{" "}
            <code className="font-mono text-xs">GOOGLE_CALENDAR_SA_JSON</code>{" "}
            in de env vars om evenementen op te halen.
          </div>
        ) : null}

        <div className="mt-5">
          <EventKeywordsClient initial={data ?? []} />
        </div>
      </section>
    </main>
  );
}
