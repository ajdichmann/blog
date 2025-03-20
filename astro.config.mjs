import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import solidJs from "@astrojs/solid-js";
import { SITE_METADATA } from "./src/consts.ts";
import robotsTxt from "astro-robots-txt";
import partytown from "@astrojs/partytown";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: SITE_METADATA.siteUrl,
  integrations: [
    mdx(),
    sitemap(),
    tailwind(),
    solidJs(),
    robotsTxt(),
    partytown(),
  ],

  output: "server",
  adapter: cloudflare(),
});
