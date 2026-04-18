"use client";

import { useState } from "react";
import { PartyPopper, Music2 } from "lucide-react";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";
import { formatTime, formatEndTime } from "@/lib/schedule-utils";
import { PartyDetailsModal } from "@/components/schedule/PartyDetailsModal";

type Props = {
  parties: PartyDisplay[];
  events: CalendarEvent[];
};

export function DayExtras({ parties, events }: Props) {
  const [selectedParty, setSelectedParty] = useState<PartyDisplay | null>(null);

  if (parties.length === 0 && events.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {parties.map((p) => (
        <button
          key={`party-${p.id}`}
          type="button"
          onClick={() => setSelectedParty(p)}
          className="flex w-full items-start gap-2 rounded-xl bg-[color:var(--clr-accent)]/10 text-[color:var(--clr-text)] px-3 py-2 text-left text-xs hover:bg-[color:var(--clr-accent)]/20 transition-colors"
        >
          <PartyPopper className="h-3.5 w-3.5 mt-0.5 text-[color:var(--clr-accent)] shrink-0" />
          <div className="tabular-nums">
            <span className="font-medium">Besloten feestje {p.title}</span>
            {(p.start_time || p.end_time) && (
              <>
                {" — "}
                {p.start_time ? p.start_time.slice(0, 5) : "?"}
                {" – "}
                {p.end_time ? p.end_time.slice(0, 5) : "?"}
              </>
            )}
            {p.guest_count ? <>, {p.guest_count} personen</> : null}
          </div>
        </button>
      ))}
      {events.map((e) => (
        <div
          key={`ev-${e.id}`}
          className="flex items-start gap-2 rounded-xl bg-[color:var(--clr-surface-2)] text-[color:var(--clr-text)] px-3 py-2 text-xs"
        >
          <Music2 className="h-3.5 w-3.5 mt-0.5 text-[color:var(--clr-text-muted)] shrink-0" />
          <div className="tabular-nums">
            <span className="font-medium">{e.title}</span>
            {e.start_time ? (
              <>
                {" — "}
                {formatTime(e.start_time)}
                {e.end_time ? ` – ${formatEndTime(e.end_time)}` : ""}
              </>
            ) : null}
          </div>
        </div>
      ))}

      {selectedParty ? (
        <PartyDetailsModal
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
        />
      ) : null}
    </div>
  );
}
