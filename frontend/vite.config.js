import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  preview: {
    // Permite cualquier host en producción (Railway asigna el dominio dinámicamente)
    allowedHosts: true,
  },
});
