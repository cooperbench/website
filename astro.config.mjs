import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://cooperbench.com",
  output: "static",
  build: {
    format: "file",
  },
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
  ],
  vite: {
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
