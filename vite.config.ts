import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 把站点放在 /<仓库名>/ 下，构建产物里的资源路径必须带这个前缀，
// 否则线上会白屏。本地 dev 仍然用根路径。部署到根域名（Vercel、自定义域名等）
// 时把 BASE_PATH 设成 / 即可。
const base = process.env.BASE_PATH ?? '/cost-cal/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
}))
