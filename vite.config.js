import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const base = '/soutenance-fmfp/';
const publicAssets = [
  'manifest.webmanifest',
  'icons/app-icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'img/figure-11-textile.svg',
  'img/bema-chat-conseil.png',
  'img/bema-cv-a-corriger.png',
  'img/bema-audit-final.png',
  ...Array.from({ length: 29 }, (_, index) => `slides-hifi/slide-${String(index + 1).padStart(2, '0')}.jpg`),
];

function offlineShell() {
  return {
    name: 'fmfp-offline-shell',
    generateBundle(_options, bundle) {
      const builtFiles = Object.keys(bundle)
        .filter((file) => !file.endsWith('.mp4') && file !== 'service-worker.js')
        .map((file) => `${base}${file}`);
      const precache = [...new Set([
        base,
        `${base}index.html`,
        ...builtFiles,
        ...publicAssets.map((file) => `${base}${file}`),
      ])];
      const workerTemplate = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
      const worker = workerTemplate
        .replace('__APP_BASE__', base)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source: worker });
    },
  };
}

export default defineConfig({
  base,
  publicDir: 'public',
  plugins: [offlineShell()],
});
