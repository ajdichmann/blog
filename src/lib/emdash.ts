import { getEmDashCollection, getEmDashEntry } from "emdash";
import { ITEMS_PER_PAGE } from "@/consts";

export type CmsTag = {
  slug: string;
  name: string;
  description?: string;
  count?: number;
};

export type CmsPost = {
  id: string;
  data: {
    title: string;
    summary: string;
    date: Date;
    lastmod?: Date;
    cover?: {
      id?: string;
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
      filename?: string;
    };
    content: Array<{ _type: string; _key?: string; [key: string]: unknown }>;
    post_layout: "simple" | "column";
    tags: CmsTag[];
    draft: boolean;
  };
};

export type CmsPage<T> = {
  data: T[];
  currentPage: number;
  lastPage: number;
  url: {
    prev?: string;
    next?: string;
  };
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function asDate(value: unknown) {
  return value ? new Date(String(value)) : new Date();
}

export function mediaSrc(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return typeof value === "string" && value ? value : undefined;
  }
  const media = value as {
    src?: string;
    url?: string;
    id?: string;
    storageKey?: string;
    meta?: { storageKey?: string };
  };
  const storageKey = media.meta?.storageKey ?? media.storageKey;
  return (
    media.src ||
    media.url ||
    (storageKey ? `/_emdash/api/media/file/${storageKey}/` : undefined) ||
    (media.id ? `/_emdash/api/media/file/${media.id}/` : undefined)
  );
}

function normalizeTag(term: any): CmsTag {
  return {
    slug: term?.slug ?? term?.id ?? "default",
    name: term?.label ?? term?.name ?? term?.slug ?? "Default",
    description: term?.description ?? "",
  };
}

function normalizeCover(cover: any) {
  if (!cover) return undefined;
  const src = mediaSrc(cover);
  if (!src) return undefined;
  return {
    id: cover.id,
    src,
    alt: cover.alt,
    width: cover.width,
    height: cover.height,
    filename: cover.filename,
  };
}

export function normalizePost(entry: any): CmsPost {
  const data = entry.data ?? {};
  const terms = Array.isArray(data.terms?.tag) ? data.terms.tag.map(normalizeTag) : [];

  return {
    id: entry.id,
    data: {
      title: asString(data.title, entry.id),
      summary: asString(data.summary),
      date: asDate(data.date ?? data.published_at),
      lastmod: data.lastmod ? asDate(data.lastmod) : undefined,
      cover: normalizeCover(data.cover),
      content: Array.isArray(data.content) ? data.content : [],
      post_layout: data.post_layout === "simple" ? "simple" : "column",
      tags: terms,
      draft: false,
    },
  };
}

export type CmsHomepage = {
  title: string;
  subtitle: string;
  showAnnouncement: boolean;
  announcementTitle: string;
  announcementCta: string;
  announcementUrl?: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  latestHeading: string;
  latestDescription: string;
  seoTitle: string;
  seoDescription: string;
};

export const HOMEPAGE_DEFAULTS: CmsHomepage = {
  title: "AJ Dichmann",
  subtitle: "Digital Marketing and SEO Consulting in Texas with Globe Runner",
  showAnnouncement: true,
  announcementTitle: "Read my newest blog post!",
  announcementCta: "Read blog",
  primaryCtaLabel: "Schedule Call",
  primaryCtaUrl: "/schedule/",
  secondaryCtaLabel: "Blog",
  secondaryCtaUrl: "/blog/",
  latestHeading: "Latest posts",
  latestDescription: "Writing about digital marketing",
  seoTitle: "AJ Dichmann",
  seoDescription: "Writing about digital marketing",
};

export async function getHomepage() {
  try {
    const { entry, error, cacheHint } = await getEmDashEntry("homepage", "home");
    if (error || !entry) {
      return { homepage: HOMEPAGE_DEFAULTS, cacheHint };
    }

    const data = entry.data ?? {};
    return {
      homepage: {
        title: asString(data.title, HOMEPAGE_DEFAULTS.title),
        subtitle: asString(data.subtitle, HOMEPAGE_DEFAULTS.subtitle),
        showAnnouncement: asBoolean(data.show_announcement, HOMEPAGE_DEFAULTS.showAnnouncement),
        announcementTitle: asString(data.announcement_title, HOMEPAGE_DEFAULTS.announcementTitle),
        announcementCta: asString(data.announcement_cta, HOMEPAGE_DEFAULTS.announcementCta),
        announcementUrl: asOptionalString(data.announcement_url),
        primaryCtaLabel: asString(data.primary_cta_label, HOMEPAGE_DEFAULTS.primaryCtaLabel),
        primaryCtaUrl: asString(data.primary_cta_url, HOMEPAGE_DEFAULTS.primaryCtaUrl),
        secondaryCtaLabel: asString(data.secondary_cta_label, HOMEPAGE_DEFAULTS.secondaryCtaLabel),
        secondaryCtaUrl: asString(data.secondary_cta_url, HOMEPAGE_DEFAULTS.secondaryCtaUrl),
        latestHeading: asString(data.latest_heading, HOMEPAGE_DEFAULTS.latestHeading),
        latestDescription: asString(data.latest_description, HOMEPAGE_DEFAULTS.latestDescription),
        seoTitle: asString(data.seo_title, HOMEPAGE_DEFAULTS.seoTitle),
        seoDescription: asString(data.seo_description, HOMEPAGE_DEFAULTS.seoDescription),
      },
      cacheHint,
    };
  } catch {
    return { homepage: HOMEPAGE_DEFAULTS, cacheHint: undefined };
  }
}

export function mergeCacheHints(
  ...hints: Array<{ tags?: string[]; lastModified?: Date } | undefined>
) {
  const tags = new Set<string>();
  let lastModified: Date | undefined;

  for (const hint of hints) {
    for (const tag of hint?.tags ?? []) tags.add(tag);
    if (hint?.lastModified && (!lastModified || hint.lastModified > lastModified)) {
      lastModified = hint.lastModified;
    }
  }

  return {
    ...(tags.size > 0 ? { tags: [...tags] } : {}),
    ...(lastModified ? { lastModified } : {}),
  };
}

export async function getPostBySlug(slug: string) {
  const { entry, error, cacheHint } = await getEmDashEntry("posts", slug);
  if (error) throw error;
  return { post: entry ? normalizePost(entry) : undefined, cacheHint };
}

export async function getPostPage(pageNumber: number, tagSlug?: string) {
  const offset = (pageNumber - 1) * ITEMS_PER_PAGE;
  const { entries, error, hasMore, cacheHint } = await getEmDashCollection("posts", {
    status: "published",
    orderBy: { date: "desc" },
    limit: ITEMS_PER_PAGE,
    offset,
    ...(tagSlug ? { where: { tag: tagSlug } } : {}),
  });
  if (error) throw error;

  const posts = entries.map(normalizePost);
  const base = tagSlug ? `/tags/${tagSlug}` : "/blog";
  const page = makePage(posts, pageNumber, Boolean(hasMore), base);
  return { page, cacheHint };
}

export async function getAllPosts(limit = 500) {
  const { entries, error, cacheHint } = await getEmDashCollection("posts", {
    status: "published",
    orderBy: { date: "desc" },
    limit,
  });
  if (error) throw error;
  return { posts: entries.map(normalizePost), cacheHint };
}

export async function getPostNeighbors(slug: string) {
  const { posts } = await getAllPosts();
  const index = posts.findIndex((post) => post.id === slug);
  return {
    prev: index >= 0 ? posts[index + 1] : undefined,
    next: index > 0 ? posts[index - 1] : undefined,
  };
}

export async function getAllTagsWithCounts() {
  const { posts, cacheHint } = await getAllPosts();
  const tags = new Map<string, CmsTag>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const current = tags.get(tag.slug) ?? { ...tag, count: 0 };
      current.count = (current.count ?? 0) + 1;
      tags.set(tag.slug, current);
    }
  }

  return {
    tags: [...tags.values()].sort((a, b) => a.name.localeCompare(b.name)),
    posts,
    cacheHint,
  };
}

function pagePath(base: string, pageNumber: number) {
  if (base === "/blog") {
    return pageNumber <= 1 ? "/blog/" : `/blog/page/${pageNumber}/`;
  }
  return pageNumber <= 1 ? `${base}/` : `${base}/${pageNumber}/`;
}

function makePage<T>(data: T[], currentPage: number, hasMore: boolean, base: string): CmsPage<T> {
  return {
    data,
    currentPage,
    lastPage: hasMore ? currentPage + 1 : currentPage,
    url: {
      prev: currentPage > 1 ? pagePath(base, currentPage - 1) : undefined,
      next: hasMore ? pagePath(base, currentPage + 1) : undefined,
    },
  };
}
