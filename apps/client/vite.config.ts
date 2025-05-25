/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/client',
  server: {
    port: 4200,
    host: 'localhost',
  },
  resolve: { // Add or ensure this section exists
    alias: {
      'app': path.resolve(__dirname, './src/app'),
      'assets': path.resolve(__dirname, './src/assets'),
      'common': path.resolve(__dirname, './src/common'),
      'features': path.resolve(__dirname, './src/features'),
      'mocks': path.resolve(__dirname, './src/mocks'),
      'locales': path.resolve(__dirname, './src/locales'),
      'layout': path.resolve(__dirname, './src/common/components/layout'), // Point to where layout components will live
      'test-utils': path.resolve(__dirname, './src/test/test-utils'), // If you create test utils
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths()], // nxCopyAssetsPlugin removed as not directly related to these core files
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    // setupFiles: './src/test/setup.ts', // Ensure this file exists if you uncomment
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    css: true,
    reporters: ['default'], // Removed 'junit' for simplicity unless specifically needed now
    // outputFile: {
    //   junit: './reports/junit.xml',
    // },
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
