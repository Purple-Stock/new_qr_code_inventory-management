import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./scripts/jest-global-setup.mjs"],
    setupFiles: ["./jest.setup.js"],
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    exclude: ["e2e/", "node_modules/"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/app/**/*.ts", "src/app/**/*.tsx", "src/lib/**/*.ts"],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
