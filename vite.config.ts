import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Cloudflare Pagesは環境変数 CF_PAGES を提供します。
  // GitHub Pages 配布時のみ /CampusRelay/ を使用し、それ以外（ローカル、Cloudflare）では / を使用します。
  const isGitHubPages = command === 'build' && !process.env.CF_PAGES;
  
  return {
    plugins: [react()],
    base: isGitHubPages ? '/CampusRelay/' : '/',
  }
})
