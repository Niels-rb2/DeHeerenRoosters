# De Heeren — Weekrooster

Next.js 16 PWA voor het weekrooster van Café De Heeren. Deployed op
`rooster.bijcafedeheeren.nl` en gekoppeld vanuit de portal.

## Lokaal draaien

```bash
npm install
# (eenmalig) supabase migratie uitvoeren — zie supabase/migrations/
npm run dev     # poort 3012
```

Vereisten in `.env.local`:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- (optioneel) `GOOGLE_CALENDAR_SA_JSON` / `GOOGLE_CALENDAR_ID`

VAPID keys genereren: `node -e "console.log(require('web-push').generateVAPIDKeys())"`.

## Deploy naar Vercel

1. `vercel` CLI: `vercel link` → koppel aan project `de-heeren-weekrooster`
2. Env vars uit `.env.local` in Vercel dashboard zetten voor **Production** én **Preview**
3. Custom domain: `rooster.bijcafedeheeren.nl`
4. Google OAuth redirect URI toevoegen:
   `https://rooster.bijcafedeheeren.nl/api/auth/callback/google`

## Google Calendar koppelen (optioneel)

1. Maak een Service Account aan in Google Cloud (project cafe-de-heeren).
2. Deel de agenda van `info@cafedeheeren.nl` met het service account e-mailadres
   (read-only rechten).
3. Download de JSON key, zet als `GOOGLE_CALENDAR_SA_JSON` (pure JSON of
   base64-gecodeerd).

Zonder koppeling werkt de app normaal — het evenementen-blokje blijft leeg.

## Stack

- Next.js 16 (App Router, `proxy.ts` i.p.v. middleware)
- NextAuth v5 — whitelist = actieve rijen in `rooster_employees`
- Supabase (gedeeld met Kanban Board) — eigen tabellen geprefixed `rooster_*`
- Tailwind 4 — darkMode class
- Web Push via service worker
- lucide-react, googleapis, web-push

## Sitemap

Medewerker:
- `/rooster` — eigen shifts + collega's per dag
- `/verlof` — aanvragen + status
- `/ruilen` — ruilverzoeken

Admin (Suzan):
- `/admin` — dashboard
- `/admin/roosters` — lijst + nieuw + editor
- `/admin/medewerkers` — CRUD + weekpatronen
- `/admin/aanvragen` — verlof + ruil review
- `/admin/instellingen` — agenda-termen
