import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(path.resolve('./package.json'), 'utf-8'));

// Schreibt die App-Version nach dem Build in dist/sw.js (CACHE_NAME).
// So ändert sich sw.js bei jeder Versionsänderung garantiert → der Browser
// erkennt das Update und der "Neue Version verfügbar"-Banner erscheint.
function swVersionPlugin(version: string): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      try {
        const content = readFileSync(swPath, 'utf-8')
          .replace(/weddingkids-v[\w.\-]+/g, `weddingkids-v${version}`);
        writeFileSync(swPath, content);
      } catch { /* sw.js nicht vorhanden (z.B. Dev) → ignorieren */ }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), swVersionPlugin(pkg.version)],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
