import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SECURITY_HEADERS } from "./lib/security-headers";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["unpdf"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  transpilePackages: ["@bible-strong/avatar-react", "@bible-strong/avatar-core"],
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
      "tw-animate-css": path.join(projectRoot, "node_modules/tw-animate-css"),
      "shadcn/tailwind.css": path.join(
        projectRoot,
        "node_modules/shadcn/dist/tailwind.css"
      ),
    },
  },
};

export default nextConfig;
