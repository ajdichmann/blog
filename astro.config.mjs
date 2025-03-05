import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import solidJs from "@astrojs/solid-js";
import { SITE_METADATA } from "./src/consts.ts";
import metaTags from "astro-meta-tags";
import robotsTxt from "astro-robots-txt";
import partytown from "@astrojs/partytown";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: SITE_METADATA.siteUrl,

  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/_"),
      changefreq: "weekly",
      lastmod: new Date(),
      serialize(item) {
        // Add any custom logic for sitemap entries
        return {
          ...item,
          // Add priority based on URL structure
          priority: item.url.includes("/blog/") ? 0.9 : 0.7,
        };
      },
    }),
    tailwind(),
    solidJs(),
    metaTags(),
    robotsTxt(),
    partytown(),
  ],

  output: "server",
  adapter: cloudflare(),
});
