import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../src/api/static/dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
          ],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-framer-motion": ["framer-motion"],
          "vendor-ui": [
            "lucide-react",
            "@radix-ui/react-slot",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/members": "http://localhost:8000",
      "/tags": "http://localhost:8000",
      "/stats": "http://localhost:8000",
      "/users": "http://localhost:8000",
      "/analytics": "http://localhost:8000",
      "/system": "http://localhost:8000",
      "/static": "http://localhost:8000",
    },
  },
});
