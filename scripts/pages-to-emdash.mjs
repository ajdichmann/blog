// Extracts copy from the hand-written pages in src/pages into EmDash "pages"
// entries. Writes src/data/pages.json (runtime fallback) and adds the "pages"
// collection + entries to .emdash/seed.json.
//
// Usage: node scripts/pages-to-emdash.mjs [--dry] [--from <dir>]
//   --from  read page sources from another directory (e.g. a checkout of the
//           hand-written pages, since src/pages now only holds thin wrappers)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "@astrojs/compiler";
import {
  htmlToPortableText,
  gutenbergToPortableText,
} from "@emdash-cms/gutenberg-to-portable-text";

const root = process.cwd();
const fromIndex = process.argv.indexOf("--from");
const pagesDir = fromIndex > 0 ? path.resolve(process.argv[fromIndex + 1]) : path.join(root, "src/pages");
const seedPath = path.join(root, ".emdash/seed.json");
const dataPath = path.join(root, "src/data/pages.json");

export const PAGE_SLUGS = [
  "404",
  "about-this-site",
  "conroe-digital-marketing",
  "conroe-the-woodlands-shopify",
  "contact",
  "dallas-javascript",
  "dallas-magento",
  "dallas-python",
  "dallas-shopify",
  "dallas-wordpress",
  "galveston-digital-marketing",
  "gtm-consultant",
  "houston-digital-marketing",
  "houston-ecommerce",
  "houston-magento",
  "houston-shopify",
  "houston-wordpress",
  "plano-digital-marketing",
  "resume",
  "san-antonio-digital-marketing",
  "schedule",
  "seo-expert-witness",
  "the-woodlands-digital-marketing",
  "the-woodlands-seo",
  "wordpress-maintenance-plans",
];

// --- AST helpers -----------------------------------------------------------

function walk(node, fn) {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

function find(node, pred) {
  let found;
  walk(node, (n) => {
    if (!found && pred(n)) found = n;
  });
  return found;
}

function attr(node, name) {
  const a = node?.attributes?.find((x) => x.name === name);
  if (!a) return undefined;
  if (a.kind === "quoted" || a.kind === "empty") return a.value;
  if (a.kind === "expression") return evalExpr(a.value);
  return a.value;
}

function evalExpr(src) {
  // Page props are plain literals; identifiers (e.g. image imports) become null.
  const stub = new Proxy({}, { has: (_, k) => k !== "JSON" && k !== "Math", get: () => null });
  // eslint-disable-next-line no-new-func
  return new Function("scope", `with (scope) { return (${src}); }`)(stub);
}

const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "source", "wbr"]);

function escapeAttr(v) {
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function serialize(nodes) {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") out += n.value;
    else if (n.type === "comment") continue;
    else if (n.type === "expression") {
      const src = n.children?.map((c) => c.value ?? "").join("") ?? "";
      const value = evalExpr(src);
      if (typeof value === "string") out += value;
      else throw new Error(`Unsupported expression in body: {${src}}`);
    } else if (n.type === "component" && n.name === "OrangeAlert") {
      out += `<orange-alert data-title="${escapeAttr(attr(n, "title") ?? "")}" data-message="${escapeAttr(attr(n, "message") ?? "")}"></orange-alert>`;
    } else if (n.type === "element") {
      const attrs = (n.attributes ?? [])
        .map((a) => (a.kind === "empty" ? ` ${a.name}` : ` ${a.name}="${escapeAttr(a.value)}"`))
        .join("");
      if (VOID.has(n.name)) out += `<${n.name}${attrs} />`;
      else out += `<${n.name}${attrs}>${serialize(n.children ?? [])}</${n.name}>`;
    } else if (n.type === "component") {
      throw new Error(`Unsupported component in body: <${n.name}>`);
    }
  }
  return out;
}

// --- HTML -> Portable Text -------------------------------------------------

// `<p class="font-bold">` is just a bold paragraph; keep it editable as text.
function unwrapBoldParagraph(n) {
  if (n.type !== "element" || n.name !== "p") return n;
  const attrs = n.attributes ?? [];
  if (attrs.length !== 1 || attrs[0].name !== "class" || attrs[0].value.trim() !== "font-bold") return n;
  return { ...n, attributes: [], children: [{ type: "element", name: "strong", attributes: [], children: n.children }] };
}

function isStyledBlock(n) {
  if (n.type !== "element") return false;
  if (["section", "div", "aside", "figure"].includes(n.name)) return true;
  return (n.attributes ?? []).some((a) => a.name === "class" || a.name === "style");
}

// The converter flattens nested lists, so lists are converted item by item
// with an explicit nesting level.
function listToPortableText(list, level = 1) {
  const listItem = list.name === "ol" ? "number" : "bullet";
  const blocks = [];
  for (const li of list.children ?? []) {
    if (li.type !== "element" || li.name !== "li") continue;
    const inline = li.children.filter((c) => !(c.type === "element" && (c.name === "ul" || c.name === "ol")));
    const html = serialize(inline).trim();
    if (html) {
      for (const block of htmlToPortableText(`<p>${html}</p>`)) {
        blocks.push({ ...block, listItem, level });
      }
    }
    for (const nested of li.children) {
      if (nested.type === "element" && (nested.name === "ul" || nested.name === "ol")) {
        blocks.push(...listToPortableText(nested, level + 1));
      }
    }
  }
  return blocks;
}

// Collapse source indentation inside text so the CMS editor shows clean copy.
function normalizeWhitespace(blocks) {
  const clean = (spans) => {
    spans.forEach((span) => {
      if (typeof span.text === "string") span.text = span.text.replace(/\s+/g, " ");
    });
    if (spans[0]?.text) spans[0].text = spans[0].text.trimStart();
    const last = spans[spans.length - 1];
    if (last?.text) last.text = last.text.trimEnd();
  };
  for (const block of blocks) {
    if (block._type === "block") clean(block.children ?? []);
    if (block._type === "table") {
      for (const row of block.rows ?? []) for (const cell of row.cells ?? []) clean(cell.content ?? []);
    }
  }
  return blocks;
}

function toPortableText(nodes) {
  const blocks = [];
  let pending = [];
  const flush = () => {
    const html = serialize(pending).trim();
    pending = [];
    if (html) blocks.push(...htmlToPortableText(html));
  };

  for (const node of nodes) {
    const n = unwrapBoldParagraph(node);
    if (n.type === "component" && n.name === "OrangeAlert") {
      flush();
      blocks.push({
        _type: "orangeAlert",
        _key: `alert-${blocks.length}`,
        title: attr(n, "title") ?? "",
        message: attr(n, "message") ?? "",
      });
    } else if (n.type === "element" && (n.name === "ul" || n.name === "ol")) {
      flush();
      blocks.push(...listToPortableText(n));
    } else if (n.type === "element" && n.name === "table") {
      flush();
      const table = serialize([{ ...n, attributes: [] }]);
      blocks.push(
        ...gutenbergToPortableText(
          `<!-- wp:table --><figure class="wp-block-table">${table}</figure><!-- /wp:table -->`
        )
      );
    } else if (isStyledBlock(n)) {
      flush();
      blocks.push({ _type: "htmlBlock", _key: `html-${blocks.length}`, html: serialize([n]).trim() });
    } else {
      pending.push(n);
    }
  }
  flush();
  return normalizeWhitespace(blocks);
}

// Repairs for malformed markup in the original pages, applied before parsing.
const SOURCE_FIXES = {
  "houston-wordpress": [
    [
      /Our <a\s+href="\/wordpress-maintenance-plans\/"><\/a>monthly WP maintenance plans\s*<\/p> cover everything from plugin and theme updates to regular security scans,\s*backups, and performance monitoring\./,
      'Our <a href="/wordpress-maintenance-plans/">monthly WP maintenance plans</a> cover everything from plugin and theme updates to regular security scans, backups, and performance monitoring.</p>',
    ],
  ],
};

// --- Page extraction -------------------------------------------------------

async function extractPage(slug, i18n) {
  let source = await readFile(path.join(pagesDir, `${slug}.astro`), "utf8");
  for (const [pattern, replacement] of SOURCE_FIXES[slug] ?? []) {
    if (!pattern.test(source)) throw new Error(`Source fix for ${slug} no longer matches`);
    source = source.replace(pattern, replacement);
  }
  const { ast } = await parse(source);

  const layout = find(ast, (n) => n.type === "component" && n.name === "RootLayout");
  const hero = find(layout, (n) => n.type === "component" && n.name === "ServicesHero");
  const interior = find(layout, (n) => n.type === "component" && n.name === "InteriorPageTitle");
  const crumbs = find(layout, (n) => n.type === "component" && n.name === "Breadcrumbs");
  // Search the whole file: broken markup can push <FAQ> outside RootLayout.
  const faq = find(ast, (n) => n.type === "component" && n.name === "FAQ");

  const page = {
    title: "",
    seo_title: attr(layout, "title") ?? "",
    seo_description: attr(layout, "description") ?? "",
  };

  if (hero) {
    page.title = attr(hero, "title") ?? "";
    page.intro = attr(hero, "description") ?? "";
    page.breadcrumb = attr(hero, "breadcrumbsText") ?? "";
    const blogLink = attr(hero, "blogLink");
    if (blogLink) {
      page.blog_link_text = blogLink.text;
      page.blog_link_url = blogLink.url;
    }
    const image = attr(hero, "image");
    if (image?.alt) page.image_alt = image.alt;
  } else if (interior) {
    page.title = attr(interior, "title") ?? "";
    page.highlight = attr(interior, "highlight") ?? "";
    if (crumbs) page.breadcrumb = attr(crumbs, "text") ?? "";
  } else {
    const h1 = find(layout, (n) => n.type === "element" && n.name === "h1");
    page.title = serialize(h1?.children ?? []).trim();
  }

  if (faq) {
    page.faq_title = attr(faq, "title") ?? "Frequently asked questions";
    page.faqs = attr(faq, "faqs") ?? [];
  }

  // Body copy. Pages with widgets (contact form, Calendly, 404) keep their
  // markup in code and only expose headings and SEO fields.
  if (slug === "404") {
    page.title = i18n["pages.404.title"];
    page.intro = i18n["pages.404.description"];
    page.cta_label = i18n["pages.404.backToHome"];
  } else if (!["contact", "schedule"].includes(slug)) {
    const prose = find(
      layout,
      (n) => n.type === "element" && /\bprose\b/.test(attr(n, "class") ?? "")
    );
    let bodyNodes;
    if (prose) {
      // Some pages close the prose div early, leaving copy as its siblings.
      const parent = find(layout, (n) => n.children?.includes(prose));
      bodyNodes = [...prose.children, ...parent.children.slice(parent.children.indexOf(prose) + 1)];
    } else {
      // Interior page without a prose wrapper (resume): everything after the title.
      const container = find(layout, (n) => n.children?.includes(interior));
      bodyNodes = container.children.slice(container.children.indexOf(interior) + 1);
    }
    page.content = toPortableText(bodyNodes.filter((n) => !(n.type === "text" && !n.value.trim())));
  }

  return page;
}

async function loadI18n() {
  const src = await readFile(path.join(root, "src/i18n/ui.ts"), "utf8");
  const map = {};
  for (const m of src.matchAll(/'(pages\.404\.[a-zA-Z]+)':\s*'([^']*)'/g)) map[m[1]] = m[2];
  return map;
}

// --- Seed ------------------------------------------------------------------

export const PAGES_COLLECTION = {
  slug: "pages",
  label: "Pages",
  labelSingular: "Page",
  description: "Service, location and utility pages. Each entry's slug matches its URL.",
  icon: "file",
  sortOrder: 1,
  supports: ["drafts", "revisions", "preview", "search"],
  urlPattern: "/{slug}/",
  routable: true,
  titleField: "title",
  fields: [
    { slug: "title", label: "Page title (H1)", type: "string", required: true, searchable: true },
    { slug: "highlight", label: "Title highlight (orange word)", type: "string" },
    { slug: "intro", label: "Intro", type: "text", searchable: true },
    { slug: "breadcrumb", label: "Breadcrumb text", type: "string" },
    { slug: "blog_link_text", label: "Hero pill text", type: "string" },
    { slug: "blog_link_url", label: "Hero pill URL", type: "string" },
    { slug: "image_alt", label: "Hero image alt text", type: "string" },
    { slug: "cta_label", label: "Button label", type: "string" },
    { slug: "content", label: "Content", type: "portableText", searchable: true },
    // Homepage ("home" entry) only.
    { slug: "show_announcement", label: "Show announcement (homepage)", type: "boolean", defaultValue: true },
    { slug: "announcement_title", label: "Announcement text (homepage)", type: "string" },
    { slug: "announcement_cta", label: "Announcement button (homepage)", type: "string" },
    { slug: "announcement_url", label: "Announcement URL (homepage)", type: "string" },
    { slug: "primary_cta_label", label: "Primary button label (homepage)", type: "string" },
    { slug: "primary_cta_url", label: "Primary button URL (homepage)", type: "string" },
    { slug: "secondary_cta_label", label: "Secondary button label (homepage)", type: "string" },
    { slug: "secondary_cta_url", label: "Secondary button URL (homepage)", type: "string" },
    { slug: "latest_heading", label: "Latest posts heading (homepage)", type: "string" },
    { slug: "latest_description", label: "Latest posts description (homepage)", type: "text" },
    { slug: "faq_title", label: "FAQ heading", type: "string" },
    { slug: "faqs", label: "FAQs (list of {question, answer})", type: "json" },
    { slug: "seo_title", label: "SEO title", type: "string", required: true },
    { slug: "seo_description", label: "SEO description", type: "text" },
  ],
};

// The homepage lives in the same collection as the "home" entry.
const HOME_PAGE = {
  title: "AJ Dichmann",
  intro: "Digital Marketing and SEO Consulting in Texas with Globe Runner",
  show_announcement: true,
  announcement_title: "Read my newest blog post!",
  announcement_cta: "Read blog",
  primary_cta_label: "Schedule Call",
  primary_cta_url: "/schedule/",
  secondary_cta_label: "Blog",
  secondary_cta_url: "/blog/",
  latest_heading: "Latest posts",
  latest_description: "Writing about digital marketing",
  seo_title: "AJ Dichmann",
  seo_description: "Writing about digital marketing",
};

async function main() {
  const dry = process.argv.includes("--dry");
  const i18n = await loadI18n();
  const pages = { home: HOME_PAGE };
  for (const slug of PAGE_SLUGS) {
    pages[slug] = await extractPage(slug, i18n);
    const blocks = pages[slug].content ?? [];
    const types = blocks.reduce((acc, b) => ((acc[b._type] = (acc[b._type] ?? 0) + 1), acc), {});
    console.log(slug.padEnd(34), JSON.stringify(types));
  }
  if (dry) return;

  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(pages, null, 2) + "\n");

  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  seed.collections = seed.collections.filter((c) => c.slug !== "pages" && c.slug !== "homepage");
  delete seed.content.homepage;
  seed.collections.push(PAGES_COLLECTION);
  seed.content.pages = Object.entries(pages).map(([slug, data]) => ({
    id: `page-${slug}`,
    slug,
    status: "published",
    data,
  }));
  await writeFile(seedPath, JSON.stringify(seed, null, 2) + "\n");
  console.log(`\nWrote ${dataPath} and updated ${seedPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
