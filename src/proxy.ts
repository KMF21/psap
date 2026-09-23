import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isCsaRoute = createRouteMatcher(["/csa(.*)"]);
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Not signed in and hitting a protected route → send to sign-in
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId) {
    // Role lives in Clerk's publicMetadata, set manually per-user in the
    // Clerk dashboard (see technical spec, Section 3). This is read from the
    // session token's "public_metadata" claim — NOT the same as the
    // top-level "role": "authenticated" claim Supabase needs; that one is
    // fixed and identical for every signed-in user, this one is per-user.
    // Your Clerk session token (Configure → Sessions → Customize) needs:
    //   { "role": "authenticated", "public_metadata": "{{user.public_metadata}}" }
    const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;

    if (isAdminRoute(req) && role !== "admin") {
      return NextResponse.redirect(new URL(role === "csa" ? "/csa" : "/", req.url));
    }
    if (isCsaRoute(req) && role !== "csa") {
      return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
