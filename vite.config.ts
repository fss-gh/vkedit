import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  // 库产物使用相对路径，保证字体资源在子目录部署或 CDN 场景下也能被加载
  base: './',
  plugins: [
    vue(),
    Icons({ compiler: 'vue3' }),
    dts({ tsconfigPath: './tsconfig.build.json' }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      name: 'Vkedit', // 全局变量名（UMD）
      fileName: (format) => `vkedit.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      // 不把这些运行时依赖打包进库，让使用方提供它们（作为 peerDependencies）
      // external: ['vue', 'konva', 'vue-konva', /^(.*\.(css|scss|sass))$/],
      external: ['vue', 'konva', 'vue-konva'],
    },
    cssCodeSplit: false,
    // 库模式下默认会把资源内联为 base64；字体文件较大，必须输出为独立资源文件
    assetsInlineLimit: 0,
  },
})
