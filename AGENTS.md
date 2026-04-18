# De Heeren — Weekrooster

Standalone Next.js 16 PWA voor het weekrooster van Café De Heeren. Deployed
op `rooster.bijcafedeheeren.nl` en gekoppeld vanuit
[de-heeren-portal](../de-heeren-portal).

## Stack

- **Next.js 16** (App Router) — gebruikt `proxy.ts` i.p.v. `middleware.ts`.
- **NextAuth v5** — Google OAuth. Whitelist = actieve rijen in
  `rooster_employees`.
- **Supabase** — gedeeld met [cafe-de-heeren-feestje](../../cafe-de-heeren-feestje)
  (Kanban Board). Onze tabellen zijn geprefixed met `rooster_*`. Feestjes lezen
  we uit de bestaande `private_event_requests` tabel.
- **Tailwind 4** — `darkMode: class`. Design tokens in `globals.css`.
- **PWA** — manifest + service worker met push-ondersteuning.

## Openingstijden Café

- Open wo–zo, standaard 16:00 – 23:00, vr/za 16:00 – 04:00.
- Ma/di gesloten. Afwijkingen per dag via `rooster_day_overrides`.

## Rol-logica

- Admin = `rooster_employees.is_admin = true` (alleen Suzan).
- Medewerker = actieve rij in `rooster_employees`.
- Geen fijnkorrelig rolsysteem.

## Day-of-week conventie

`day_of_week`: 0=ma, 1=di, 2=wo, 3=do, 4=vr, 5=za, 6=zo.

## "Tot sluit"

`end_time IS NULL` betekent "tot sluitingstijd". De sluitingstijd van die dag
wordt afgeleid uit `rooster_day_overrides.custom_close_time` of anders de
standaard (23:00 of 04:00 volgende dag voor vr/za).

## Database migraties

Zie `supabase/migrations/`. Toepassen via Supabase SQL editor of `supabase db push`.

## Environment

- Ontwikkeling draait op poort **3012**.
- Zie `.env.example` voor vereiste variabelen.
- Voor productie moet een nieuwe OAuth client aangemaakt worden die
  `https://rooster.bijcafedeheeren.nl/api/auth/callback/google` toestaat.

## Deploy

Vercel project — domein `rooster.bijcafedeheeren.nl`. Environment variables
komen uit `.env.local` (synced via `vercel env pull` / dashboard).
