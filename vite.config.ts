import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Cloudflare Pages는 환경변수 CF_PAGES를 제공합니다.
  // GitHub Pages 배포 시에만 /CampusRelay/를 사용하고, 그 외(로컬, Cloudflare)에는 /를 사용합니다.
  const isGitHubPages = command === 'build' && !process.env.CF_PAGES;
  
  return {
    plugins: [react()],
    base: isGitHubPages ? '/CampusRelay/' : '/',
  }
})
