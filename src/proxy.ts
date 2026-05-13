import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Per Clerk's Next.js App Router pattern, the proxy attaches the auth
 * context but does NOT protect routes. Pages and API routes own their
 * own auth checks via `auth()` / `requireUserId()`.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
