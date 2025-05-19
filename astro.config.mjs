import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import solidJs from "@astrojs/solid-js";
import { SITE_METADATA } from "./src/consts.ts";
import robotsTxt from "astro-robots-txt";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: SITE_METADATA.siteUrl,
  trailingSlash: "always",
  integrations: [
    mdx(),
    sitemap(),
    tailwind(),
    solidJs(),
    robotsTxt(),
  ],

  output: "server",
  adapter: cloudflare(),
  middleware: "./src/middleware.ts",
});
