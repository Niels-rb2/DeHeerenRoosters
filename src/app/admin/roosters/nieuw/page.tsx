import { NewScheduleForm } from "@/components/admin/NewScheduleForm";
import { weekStart, toISODate } from "@/lib/schedule-utils";

export default async function NewSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;

  let defaultWeek: string;
  if (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)) {
    // Forceer naar maandag (voor als iemand een willekeurige dag meegeeft).
    defaultWeek = toISODate(weekStart(new Date(`${params.week}T00:00:00`)));
  } else {
    const today = new Date();
    const thisMonday = weekStart(today);
    const nextMonday = new Date(thisMonday);
    if (today.getTime() > thisMonday.getTime()) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }
    defaultWeek = toISODate(nextMonday);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 md:px-10 py-8 md:py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">Nieuw rooster</h1>
      <p className="mt-3 text-sm text-[color:var(--clr-text-muted)]">
        Kies de week. Shifts worden automatisch ingevuld op basis van de vaste
        weekpatronen van actieve medewerkers. Je kunt daarna uitzonderingen
        aanpassen voordat je het rooster publiceert.
      </p>

      <div className="mt-8">
        <NewScheduleForm defaultWeekStart={defaultWeek} />
      </div>
    </main>
  );
}
