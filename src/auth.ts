import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Employee } from "@/types/database";

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-de-heeren-rooster-session"
        : "de-heeren-rooster-session",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
        domain: isProduction ? ".bijcafedeheeren.nl" : undefined,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Whitelist = actieve medewerker in de `rooster_employees` tabel.
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      const { data } = await supabaseAdmin()
        .from("rooster_employees")
        .select("id, is_active")
        .eq("email", email)
        .maybeSingle<Pick<Employee, "id" | "is_active">>();
      return !!data && data.is_active;
    },
    async jwt({ token, profile }) {
      // Bij login: haal rol + id op en cache in het JWT.
      if (profile?.email) {
        const { data } = await supabaseAdmin()
          .from("rooster_employees")
          .select("id, name, is_admin")
          .eq("email", profile.email.toLowerCase())
          .maybeSingle<Pick<Employee, "id" | "name" | "is_admin">>();
        if (data) {
          token.employeeId = data.id;
          token.isAdmin = data.is_admin;
          token.name = data.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.employeeId = token.employeeId as string | undefined;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
