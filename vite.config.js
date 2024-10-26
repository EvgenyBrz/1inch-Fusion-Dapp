import { defineConfig } from 'vite';
import process from 'process';

export default defineConfig({
  server: {
    open: true,
  },
  define: {
    'process.env': process.env, // Polyfill process.env
  },
  resolve: {
    alias: {
      assert: 'assert', // Polyfill for assert module
    },
  },
});
