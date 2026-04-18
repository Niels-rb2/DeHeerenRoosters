import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmployeeNav } from "@/components/layout/EmployeeNav";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-dvh pb-24">
      {children}
      <InstallPrompt />
      <EmployeeNav userName={session.user.name} />
    </div>
  );
}
