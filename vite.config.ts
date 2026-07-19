import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'process', 'stream', 'util'] }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // ⚠️ DEV-ONLY PROXIES. These only run under `vite` (local dev). In production
    // (Netlify static build) they DO NOT EXIST — requests to /api, /binance,
    // /coingecko, /feargreed, /gmgn would otherwise hit the SPA and return
    // index.html (→ "Unexpected token <" JSON errors). Production proxying lives
    // in `netlify.toml` redirects (public APIs) + VITE_API_BASE_URL (the Go
    // backend at /api). Keep these two in sync if you add/rename a prefix.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept-Encoding', 'identity')
          })
        },
      },
      '/gmgn': {
        target: 'https://gmgn.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gmgn/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            )
            proxyReq.setHeader('Origin', 'https://gmgn.ai')
            proxyReq.setHeader('Referer', 'https://gmgn.ai/')
            proxyReq.setHeader('Accept', 'application/json, */*')
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9')
          })
        },
      },
      '/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coingecko/, ''),
      },
      '/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance/, ''),
      },
      '/fapi': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fapi/, ''),
      },
      '/feargreed': {
        target: 'https://api.alternative.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/feargreed/, ''),
      },
      '/hl': {
        target: 'https://api.hyperliquid.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hl/, ''),
      },
      '/ctnews': {
        target: 'https://cointelegraph.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ctnews/, ''),
      },
      '/cdnews': {
        target: 'https://www.coindesk.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdnews/, ''),
      },
      '/decnews': {
        target: 'https://decrypt.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/decnews/, ''),
      },
      '/btcmnews': {
        target: 'https://bitcoinmagazine.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/btcmnews/, ''),
      },
      '/beinnews': {
        target: 'https://beincrypto.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/beinnews/, ''),
      },
      '/btcinews': {
        target: 'https://bitcoinist.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/btcinews/, ''),
      },
      '/csnews': {
        target: 'https://cryptoslate.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/csnews/, ''),
      },
      '/bwknews': {
        target: 'https://blockworks.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bwknews/, ''),
      },
    },
  },
  build: {
    // Pages are code-split via React.lazy in App.tsx; Rollup's default chunking
    // then keeps lazy-only libs (three, charts, markdown) out of the initial
    // load automatically. No manualChunks catch-all (it duplicated nested deps).
    chunkSizeWarningLimit: 4000,
  },
  optimizeDeps: {
    // Pre-bundle the 3D stack so the lazy CoinField import doesn't trigger a
    // mid-session re-optimize + full-reload loop.
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/rapier',
      '@react-three/postprocessing',
      'postprocessing',
      '@paper-design/shaders',
      '@phosphor-icons/react',
      '@radix-ui/react-select',
      // OGL powers the <Strands> WebGL bg on login/register — pre-bundle it so
      // the lazy login import doesn't trigger a mid-session re-optimize loop.
      'ogl',
    ],
  },
})
