/**
 * Site metadata that is used across the site.
 *
 * A few of these are not used yet, and are subject to change, example of this is Author.
 */
interface SiteMetadata {
  theme: 'system' | 'light' | 'dark';
  siteUrl: string;
  title: string;
  siteRepo: string;
  language: string;
  calendly: string;
  robots: string;
  analytics: AnalyticsConfig;
}

interface AnalyticsConfig {
  fathom?: {
    site: string;
    src: string;
  };
  googleAnalyticsId?: string;
  metricalApp?: string;
  plausible?: {
    domain: string;
    src: string;
  };
  simpleAnalytics: boolean;
  umami?: {
    site: string;
    dataId: string;
    host: string;
  };
  matomo?: {
    id: string;
    url: string;
  };
  minimalAnalyticsId?: string;
}

interface PostMetadata {
  defaultLayout: 'simple' | 'column';
  showFullWidthCover: boolean;
  showCover: boolean;
  showTags: boolean;
  showDate: boolean;
  showSummary: boolean;
  showAuthors: boolean;
  showRelatedPosts: boolean;
  showTableOfContents: boolean;
  showShareButtons: 'top' | 'bottom' | 'both' | 'none';
}

export const SITE_METADATA: SiteMetadata = {
  theme: "system",
  siteUrl: "https://www.ajdichmann.com",
  siteRepo: "https://github.com/wanoo21/tailwind-astro-starting-blog",
  title: "AJ's Blog",
  calendly: "https://calendly.com/aj-globerunner/60min",
  language: "en",
  robots: "index, follow",
  analytics: {
    fathom: {
      site: "",
      src: "https://cdn.usefathom.com/fathom.js",
    },
    googleAnalyticsId: undefined,
    metricalApp: undefined,
    plausible: {
      domain: "",
      src: "https://plausible.io/js/plausible.js",
    },
    simpleAnalytics: false,
    umami: {
      site: "",
      dataId: "",
      host: "/umami.js",
    },
    matomo: {
      id: "",
      url: "",
    },
    minimalAnalyticsId: undefined,
  },
};

/**
 * Default posts per page for pagination.
 */
export const ITEMS_PER_PAGE = 5;

export const POST_METADATA: PostMetadata = {
  defaultLayout: "column",
  showFullWidthCover: false,
  showCover: false,
  showTags: true,
  showDate: true,
  showSummary: true,
  showAuthors: true,
  showRelatedPosts: true,
  showTableOfContents: true,
  showShareButtons: 'bottom',
};
