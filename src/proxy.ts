import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/signin(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/verify-email(.*)",
  "/api/stripe/webhook",         // 👈 add this
  "/api/bookings/(.*)",          // For verifying bookings exist
  "/api/test-webhook",           // For local testing
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
