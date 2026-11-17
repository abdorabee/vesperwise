import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      ".claude/**",
      // Playwright specs run with `npm run test:e2e`, not Vitest.
      "e2e/**",
      "workers/shared/pg-queue.test.mjs",
    ],
  },
});
