import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/", "/api/", "/settings/", "/pipeline/", "/people/", "/history/", "/watchlist/",
          "/billing/", "/api-keys/", "/lists/", "/inbox/", "/analyze/", "/autopilot/", "/score/", "/bulk/",
          "/onboarding", "/dev/", "/thank-you",
        ],
      },
    ],
    sitemap: "https://www.vesperwise.com/sitemap.xml",
  };
}
