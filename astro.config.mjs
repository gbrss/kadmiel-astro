import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    // Fuerza a que TODO el CSS se incruste en el HTML para eliminar el bloqueo de renderizado
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      minify: 'esbuild',
      cssMinify: 'lightningcss',
      target: 'es2022',
    }
  },
});