// Next.js 16 gebruikt `proxy.ts` in plaats van `middleware.ts`.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|icons|images|logo\\.svg|manifest\\.json|sw\\.js|fonts).*)",
  ],
};
