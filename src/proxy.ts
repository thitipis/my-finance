export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all app routes
    "/(app)/:path*",
    // Protect admin routes
    "/admin/:path*",
    // Protect all API routes except public ones
    "/api/((?!auth|tax/years|tax/config).*)/:path*",
  ],
};
