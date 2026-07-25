import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/repositorio_x/",
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "pages-dist",
    emptyOutDir: true,
  },
});
