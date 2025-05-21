import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Instead of directly importing, we'll handle this conditionally
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  // Conditionally load plugins to avoid errors in production/Vercel
  const plugins = [react()];
  
  // Only attempt to use lovable-tagger in development mode
  if (mode === 'development') {
    try {
      // Dynamic import attempt - will gracefully fail if package isn't available
      const lovableTagger = require('lovable-tagger');
      if (lovableTagger && lovableTagger.componentTagger) {
        plugins.push(lovableTagger.componentTagger());
      }
    } catch (e) {
      console.log('Note: lovable-tagger not available, skipping component tagging');
    }
  }
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      // Increase chunk size warning limit to avoid unnecessary warnings
      chunkSizeWarningLimit: 1600,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Make env variables available to the app
      '__APP_ENV__': JSON.stringify(mode),
      '__IS_DEV__': mode === 'development'
    }
  };
});
