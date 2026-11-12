import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    // Mantenemos 'auto'. Forzar 'always' puede hacer el HTML demasiado pesado y retrasar el LCP.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
      // Buena práctica: Evitar el "JavaScript heredado" compilando para navegadores modernos.
      target: 'es2022', 
    }
  },
});