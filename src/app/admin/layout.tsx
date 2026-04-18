import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminNav } from "@/components/layout/AdminNav";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/rooster");

  const db = supabaseAdmin();
  const [leaveCount, swapCount] = await Promise.all([
    db
      .from("rooster_leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("rooster_swap_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_admin"),
  ]);
  const pendingCount = (leaveCount.count ?? 0) + (swapCount.count ?? 0);

  return (
    <div className="min-h-dvh">
      <AdminNav userName={session.user.name} pendingCount={pendingCount} />
      <div className="md:pl-60 pb-20 md:pb-0">{children}</div>
    </div>
  );
}
