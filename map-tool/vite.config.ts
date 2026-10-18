import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@game": fileURLToPath(new URL("../app/maps", import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 2420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || "127.0.0.1",
    fs: { allow: [".."] },
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
