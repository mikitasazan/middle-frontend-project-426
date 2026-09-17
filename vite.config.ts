import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В dev фронтенд ходит на относительный /api, Vite проксирует его на бэкенд.
    // В проде проксировать нечего: Fastify сам отдаёт и статику, и /api (single-origin).
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  build: {
    // Бэкенд компилируется в dist/server, фронтенд собирается в dist/client —
    // именно этот каталог Fastify раздаёт как статику.
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
