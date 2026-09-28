import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import solidJs from "@astrojs/solid-js";
import react from "@astrojs/react";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";
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
    sitemap({
      filter: (page) => !/\/blog\/\d+\/$/.test(page) && !/\/tags\/[^/]+\/\d+\/$/.test(page),
    }),
    solidJs({
      include: ["src/components/solidjs/**/*"],
    }),
    react({
      exclude: ["src/components/solidjs/**/*"],
    }),
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      siteUrl: SITE_METADATA.siteUrl,
    }),
    robotsTxt(),
  ],

  output: "server",
  adapter: cloudflare(),
});
