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
  "/api/v1/(.*)",
  "/api/chat(.*)",
  "/api/billing/webhook",
  "/api/contact",
];

const previewPublicRoutes = [
  ...basePublicRoutes,
  "/onboarding(.*)",
  "/dev/score-entry(.*)",
  "/score-surfaces-preview(.*)",
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
