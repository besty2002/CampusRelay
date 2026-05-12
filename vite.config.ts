import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Cloudflare Pages provides CF_PAGES in the build environment.
  // Use /CampusRelay/ only for GitHub Pages builds; local and Cloudflare builds use /.
  const isGitHubPages = command === 'build' && !process.env.CF_PAGES;
  const base = isGitHubPages ? '/CampusRelay/' : '/';

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: false,
        devOptions: {
          enabled: false,
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'CampusRelay',
          short_name: 'CampusRelay',
          description: 'School Item Sharing Platform',
          theme_color: '#84cc16',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    base,
  };
});
