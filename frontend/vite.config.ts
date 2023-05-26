// Disable no-extraneous-dependencies because vite is not set up in airbnb's eslint config
/* eslint-disable import/no-extraneous-dependencies */
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import eslintPlugin from 'vite-plugin-eslint';
import svgLoader from 'vite-svg-loader';

let svgPrefixCounter = 0;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    eslintPlugin(),
    svgLoader({
      svgoConfig: {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                // viewBox is required to resize SVGs with CSS.
                removeViewBox: false,
              },
            },
          },
          { name: 'removeDimensions' },
          // Prefix IDs in the SVG to avoid conflicts
          {
            name: 'prefixIds',
            params: {
              prefix: ({ name }: { name: string }) => {
                if (name === 'svg') svgPrefixCounter += 1;
                return `svg-id-${svgPrefixCounter}`;
              },
              prefixClassNames: false,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    sourcemap: 'inline',
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use 'sass:math';
          @use 'sass:color';
          @use 'sass:map';
          @import './src/assets/scss/_variables.scss';
          @import './src/assets/scss/_mixins.scss';
          @import './src/assets/scss/_functions.scss';
        `,
      },
    },
  },
});
