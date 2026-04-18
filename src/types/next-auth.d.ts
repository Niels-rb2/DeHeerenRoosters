import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      employeeId?: string;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId?: string;
    isAdmin?: boolean;
  }
}
