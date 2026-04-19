import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Уникальный идентификатор запуска/сборки. Меняется при каждом старте Vite
// (и при каждой продакшен-сборке), поэтому фронт может обнаружить рестарт
// проекта и принудительно выполнить logout.
const BUILD_ID = String(Date.now())

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5240',
        changeOrigin: true,
      },
    },
  },
})
