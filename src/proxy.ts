import { clerkMiddleware } from "@clerk/nextjs/server";

// Per Clerk's current guidance, this middleware ONLY establishes the auth
// context (so `auth()` works in Server Components/layouts below) — it does
// NOT do path-based route protection anymore. `createRouteMatcher` +
// path-matching redirects were deprecated in favor of "resource-based auth
// checks": each protected layout checks auth itself, which can't drift out
// of sync with how Next.js actually routes requests the way a centralized
// path-matcher can. See src/app/admin/layout.tsx and src/app/csa/layout.tsx
// for the actual protection logic.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
