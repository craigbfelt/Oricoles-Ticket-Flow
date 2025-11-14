import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Enable CORS for iframe embedding from any origin during development
    cors: true,
    // Add headers to allow iframe embedding
    headers: {
      // Allow embedding in iframes from any origin
      'X-Frame-Options': 'ALLOWALL',
      // Modern alternative to X-Frame-Options
      'Content-Security-Policy': "frame-ancestors *",
      // Enable CORS
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure production builds also support iframe embedding
  build: {
    // Output to dist directory (default)
    outDir: 'dist',
    // Generate sourcemaps for easier debugging
    sourcemap: mode === 'development',
  },
}));
