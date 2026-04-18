"use client";

import { PartyPopper } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { PartyDisplay } from "@/lib/parties";

export function PartyDetailsModal({
  party,
  onClose,
}: {
  party: PartyDisplay;
  onClose: () => void;
}) {
  const time =
    party.start_time || party.end_time
      ? `${party.start_time?.slice(0, 5) ?? "?"} – ${party.end_time?.slice(0, 5) ?? "?"}`
      : null;

  return (
    <Modal title="Besloten feestje" onClose={onClose}>
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--clr-accent)]/15 text-[color:var(--clr-accent)] px-3 py-1 text-xs uppercase tracking-wide">
          <PartyPopper className="h-3.5 w-3.5" />
          Feestje
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-[color:var(--clr-text-muted)]">Naam</dt>
          <dd className="font-medium">{party.title}</dd>

          {party.occasion_type ? (
            <>
              <dt className="text-[color:var(--clr-text-muted)]">Gelegenheid</dt>
              <dd>{party.occasion_type}</dd>
            </>
          ) : null}

          {time ? (
            <>
              <dt className="text-[color:var(--clr-text-muted)]">Tijdstip</dt>
              <dd className="tabular-nums">{time}</dd>
            </>
          ) : null}

          {party.guest_count ? (
            <>
              <dt className="text-[color:var(--clr-text-muted)]">Aantal personen</dt>
              <dd className="tabular-nums">{party.guest_count}</dd>
            </>
          ) : null}
        </dl>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-ghost">
            Sluiten
          </button>
        </div>
      </div>
    </Modal>
  );
}
