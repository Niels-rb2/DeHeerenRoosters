import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only. Service role key — omzeilt RLS. Nooit naar de browser sturen.
// We untypen de client bewust: de gegenereerde Insert/Update-types van
// @supabase/supabase-js zijn te strikt om fijn mee te werken zonder gegenereerde
// types. We typen per query met `.returns<T>()` en `.single<T>()`.
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return cached;
}
