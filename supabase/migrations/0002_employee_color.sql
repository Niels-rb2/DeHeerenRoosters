-- Voeg kleur-voorkeur toe per medewerker. Hex-waarde uit een vaste palette
-- van 16 kleuren (zie src/lib/palette.ts). NULL = geen kleur toegewezen.
ALTER TABLE rooster_employees
  ADD COLUMN IF NOT EXISTS color TEXT;
