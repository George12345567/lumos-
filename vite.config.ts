import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Optimize dependencies for better performance
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
    build: {
      // Code splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
            'animation-vendor': ['framer-motion'],
            'form-vendor': ['@emailjs/browser'],
          },
        },
      },
      // Enable minification (esbuild is default and faster)
      minify: 'esbuild',
      // Increase chunk size warning limit (for large preview tool)
      chunkSizeWarningLimit: 1000,
    },
  };
});
