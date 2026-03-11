import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Cloudflare Pagesは環境変数 CF_PAGES を提供します。
  // GitHub Pages 配布時のみ /CampusRelay/ を使用し、それ以外（ローカル、Cloudflare）では / を使用します。
  const isGitHubPages = command === 'build' && !process.env.CF_PAGES;
  const base = isGitHubPages ? '/CampusRelay/' : '/';
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
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
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    base: base,
  }
})
