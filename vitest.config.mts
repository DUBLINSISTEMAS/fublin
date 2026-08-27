import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    // Padrão: Node (lib, serviços, actions). Testes de componente declaram `// @vitest-environment jsdom` no topo.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/features/**", "src/db/**", "src/components/**"],
      exclude: ["**/*.test.*", "src/db/seed.ts", "src/test/**"],
    },
  },
});
