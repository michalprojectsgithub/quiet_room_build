import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';

// Copy the library folder into dist so static assets (master studies, warmups, etc.)
// are available in production builds.
const copyLibraryPlugin = () => {
  return {
    name: 'copy-library',
    writeBundle() {
      const src = resolve(__dirname, 'library');
      const dest = resolve(__dirname, 'dist', 'library');
      if (!existsSync(src)) return;
      // Clean destination to avoid stale files
      rmSync(dest, { recursive: true, force: true });
      cpSync(src, dest, { recursive: true });
    },
  };
};

export default defineConfig({
  plugins: [react(), copyLibraryPlugin()],
  server: {
    proxy: { '/api': 'http://localhost:8787' }
  }
});
