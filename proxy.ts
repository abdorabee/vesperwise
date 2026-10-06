import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { unauthorizedResponse } from "@/lib/api-errors";
import { isApiPath, requiresAuth } from "@/lib/route-access";

const production = process.env.VERCEL_ENV === "production";

const clerk = clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    if (!requiresAuth(pathname, { production })) return;

    // API callers get a JSON 401 instead of a sign-in redirect or an HTML 404.
    if (isApiPath(pathname)) {
      const { userId } = await auth();
      if (!userId) return unauthorizedResponse();
      return;
    }

    await auth.protect();
  },
  // Send signed-out visitors to our own auth pages, not the Clerk-hosted portal.
  { signInUrl: "/login", signUpUrl: "/signup" }
);

export async function proxy(req: NextRequest, ev: NextFetchEvent) {
  return clerk(req, ev);
}

export const config = {
  // Skip Next internals and static files (favicons, OG image, robots.txt, sitemap.xml, manifest)
  // so signed-out visitors and crawlers can fetch them; API routes always run.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml|mp4|webm)).*)",
    "/(api|trpc)(.*)",
  ],
};
