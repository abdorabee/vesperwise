import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const basePublicRoutes = [
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/pricing(.*)",
  "/docs(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/contact(.*)",
  "/about(.*)",
  "/legal/(.*)",
  "/thank-you",
  "/opengraph-image(.*)",
  "/api/v1/(.*)",
  "/api/chat(.*)",
  "/api/billing/webhook",
  "/api/contact",
];

const previewPublicRoutes = [
  ...basePublicRoutes,
  "/onboarding(.*)",
  "/dev(.*)",
];

const isPublicRoute = createRouteMatcher(
  process.env.VERCEL_ENV === "production" ? basePublicRoutes : previewPublicRoutes
);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export async function proxy(req: NextRequest, ev: NextFetchEvent) {
  return clerk(req, ev);
}

export const config = {
  // Skip Next internals and static files (favicons, OG image, robots.txt, sitemap.xml, manifest)
  // so signed-out visitors and crawlers can fetch them; API routes always run.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)",
    "/(api|trpc)(.*)",
  ],
};
