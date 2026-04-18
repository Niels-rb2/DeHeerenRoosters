import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-12">
      <div className="card w-full max-w-md p-8 md:p-10">
        <p className="eyebrow">Café De Heeren</p>
        <h1 className="mt-2 text-2xl md:text-[2rem] font-medium leading-tight">
          Weekrooster
        </h1>
        <p className="mt-4 text-[color:var(--clr-text-muted)] text-sm leading-relaxed">
          Log in met je Google-account om het rooster te bekijken. Alleen
          medewerkers die door Suzan zijn toegevoegd kunnen inloggen.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button type="submit" className="btn-primary w-full">
            Inloggen met Google
          </button>
        </form>

        {error ? (
          <p className="mt-6 text-sm text-[color:var(--clr-danger)]">
            Deze account staat niet op de lijst. Vraag Suzan om je toe te voegen.
          </p>
        ) : null}
      </div>
    </main>
  );
}
