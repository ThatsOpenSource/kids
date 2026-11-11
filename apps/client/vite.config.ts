import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7430,
    proxy: { "/api": "http://localhost:7420" },
    open: false,
  },
  clearScreen: false,
});