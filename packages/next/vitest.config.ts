import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "server-only": new URL("./test/empty.ts", import.meta.url).pathname,
      "@fewchurs/react/core": new URL("../react/src/core.ts", import.meta.url).pathname,
      "@fewchurs/react": new URL("../react/src/index.ts", import.meta.url).pathname,
    },
  },
});
