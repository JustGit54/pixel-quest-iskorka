import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths work inside Android WebView and iOS WKWebView.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist'
  }
});
