import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative paths, so that the page works under each address.
  base: "./",
  build: {
    // The style minifier removes `translate` when `transform` follows in the same rule.
    cssMinify: false,
  },
  test: { include: ["src/**/*.test.ts"] },
});
