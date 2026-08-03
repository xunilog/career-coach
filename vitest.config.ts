import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
    // Default environment is node (for service tests).
    // Renderer tests override to jsdom via @vitest-environment docblock.
  },
});
