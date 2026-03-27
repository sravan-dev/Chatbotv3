import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isWidgetBuild = process.env.BUILD_TARGET === 'widget';

export default defineConfig({
  plugins: [react()],
  define: isWidgetBuild
    ? {
        'process.env.NODE_ENV': JSON.stringify('production'),
      }
    : undefined,
  build: isWidgetBuild
    ? {
        target: 'es2018',
        lib: {
          entry: resolve(__dirname, 'src/widget/entry.tsx'),
          name: 'SupportDeskWidget',
          formats: ['iife'],
          fileName: () => 'chatbot-widget-app.js',
        },
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            extend: true,
          },
        },
      }
    : {
        target: 'es2018',
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
      },
});
