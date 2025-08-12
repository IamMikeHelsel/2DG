import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { port: 5173, host: true },
  build: { outDir: "dist" },
  plugins: [tsconfigPaths()],
});
