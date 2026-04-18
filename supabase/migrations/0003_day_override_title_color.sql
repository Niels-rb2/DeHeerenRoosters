-- Voeg titel en kleur-accent toe aan dag-overrides.
-- title: bijv. "Koningsdag", "WK-finale" — zichtbaar bovenaan de dagkolom.
-- color: hex uit dezelfde palette als medewerkers (zie src/lib/palette.ts).
ALTER TABLE rooster_day_overrides
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;
