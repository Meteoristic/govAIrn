import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Instead of directly importing, we'll handle this conditionally
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
