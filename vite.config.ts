import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Add this block to override the default Cloudflare target for Vercel
  nitro: {
    preset: "vercel",
  },
});
