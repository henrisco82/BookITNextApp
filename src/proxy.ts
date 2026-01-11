import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/signin(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/verify-email(.*)",
  "/api/stripe-webhook(.*)", // Stripe webhook must be public
]);

export default clerkMiddleware(async (auth, request) => {
  // Only protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// 👇 Exclude Stripe webhook from middleware completely
export const config = {
  matcher: [
    // Protect everything EXCEPT Stripe webhook, _next, static files, etc.
    '/((?!api/stripe-webhook|_next|.*\\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?|webp|json|map|html)).*)',
  ],
};

