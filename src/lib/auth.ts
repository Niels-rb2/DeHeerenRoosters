import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.employeeId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
