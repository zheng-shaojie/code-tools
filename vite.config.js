import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // 使用相对路径（对uTools很重要）
  base: './',
  
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 将所有非Vue组件的标签视为自定义元素
          isCustomElement: (tag) => tag.includes('-')
        }
      }
    })
  ],
  
  // 开发服务器配置
  server: {
    port: 5173,
    host: 'localhost',
    open: false
  },
  
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 清空输出目录
    emptyOutDir: true,
    
    // 构建目标（为uTools兼容性）
    target: 'es2015',
    
    // 代码分割阈值
    chunkSizeWarningLimit: 1000,
    
    // Rollup配置
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // 静态资源文件名格式
        assetFileNames: (assetInfo) => {
          // CSS文件
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/style.css'
          }
          // 其他静态资源
          return 'assets/[name].[hash].[ext]'
        },
        // JS文件名格式
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/main.[hash].js',
        
        // 手动代码分割
        manualChunks: {
          // Vue相关
          vue: ['vue'],
          // Excel处理库
          xlsx: ['xlsx']
        },
        
        // 为uTools兼容性，确保输出CommonJS兼容格式
        format: 'es'
      }
    },
    
    // 生成source map用于调试
    sourcemap: false,
    
    // 最小化输出
    minify: 'terser',
    
    // Terser配置
    terserOptions: {
      compress: {
        // 移除console
        drop_console: true,
        // 移除debugger
        drop_debugger: true
      }
    }
  },
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'src/styles')
    }
  },
  
  // 定义全局常量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0')
  },
  
  // CSS配置
  css: {
    // CSS预处理器选项
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/variables.scss";`
      }
    },
    // CSS模块化
    modules: {
      // 生成的CSS类名格式
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    }
  },
  
  // 优化依赖
  optimizeDeps: {
    include: ['vue', 'xlsx']
  }
})