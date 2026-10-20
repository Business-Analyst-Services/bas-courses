import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything requires a login except the auth pages themselves.
// Auth pages, plus the cron endpoint (which checks its own CRON_SECRET).
const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/cron(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Gated course files (incl. .png sample outputs) always need the auth context.
    "/files/(.*)",
  ],
};
