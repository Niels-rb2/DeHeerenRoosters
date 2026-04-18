import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Employee, DefaultPattern } from "@/types/database";
import { EmployeesClient } from "@/components/admin/EmployeesClient";

export const dynamic = "force-dynamic";

export default async function MedewerkersPage() {
  const admin = supabaseAdmin();

  const [employeesRes, patternsRes] = await Promise.all([
    admin
      .from("rooster_employees")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true })
      .returns<Employee[]>(),
    admin
      .from("rooster_default_patterns")
      .select("*")
      .order("day_of_week", { ascending: true })
      .returns<DefaultPattern[]>(),
  ]);

  const employees = employeesRes.data ?? [];
  const patterns = patternsRes.data ?? [];

  const patternsByEmployee: Record<string, DefaultPattern[]> = {};
  for (const p of patterns) {
    (patternsByEmployee[p.employee_id] ??= []).push(p);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10 py-8 md:py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">Medewerkers</h1>
      <p className="mt-3 max-w-2xl text-sm text-[color:var(--clr-text-muted)]">
        Voeg medewerkers toe en stel hun vaste weekpatroon in. Het patroon wordt
        automatisch gebruikt bij het aanmaken van een nieuw rooster.
      </p>

      <EmployeesClient
        initialEmployees={employees}
        initialPatternsByEmployee={patternsByEmployee}
      />
    </main>
  );
}
