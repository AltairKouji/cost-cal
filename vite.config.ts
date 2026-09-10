import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 把站点放在 /<仓库名>/ 下，资源路径必须带这个前缀，否则线上白屏。
// dev / preview / build 一律用同一个前缀，本地看到的路径就是线上的路径。
// 部署到根域名（Vercel、自定义域名等）时构建前设 BASE_PATH=/ 覆盖即可。
const base = process.env.BASE_PATH ?? '/cost-cal/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { host: true, port: 5173 },
})
