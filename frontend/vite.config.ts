import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth":      "http://localhost:8000",
      "/shifts":    "http://localhost:8000",
      "/incidents": "http://localhost:8000",
      "/comments":  "http://localhost:8000",
      "/messages":  "http://localhost:8000",
      "/users":     "http://localhost:8000",
      "/wiki":      "http://localhost:8000",
      "/search":    "http://localhost:8000",
      "/audit":     "http://localhost:8000",
      "/media":     "http://localhost:8000",
    },
  },
})
