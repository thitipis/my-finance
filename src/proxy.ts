export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static, _next/image, favicon.ico (Next.js internals)
     *  - /login, /register (auth pages — handled inside authorized())
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
