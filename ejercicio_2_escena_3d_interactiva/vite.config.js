import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración mínima de Vite para una app React + React Three Fiber.
export default defineConfig({
  plugins: [react()],
  base: './',
});
