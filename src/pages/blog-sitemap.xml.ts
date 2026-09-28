import { SITE_METADATA } from "@/consts";
import { getAllPosts } from "@/lib/emdash";

export const prerender = false;

export async function GET() {
  const { posts } = await getAllPosts();
  const urls = posts
    .map((post) => {
      const loc = `${SITE_METADATA.siteUrl}/blog/${post.id}/`;
      const lastmod = (post.data.lastmod ?? post.data.date).toISOString();
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
