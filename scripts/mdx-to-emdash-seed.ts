import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";

const repoRoot = process.cwd();
const blogDir = path.join(repoRoot, "src/content/blog");
const tagsDir = path.join(repoRoot, "src/content/tags");
const seedPath = path.join(repoRoot, ".emdash/seed.json");
const rawAssetBase =
  "https://raw.githubusercontent.com/ajdichmann/blog/main/src/assets";

type MdNode = {
  type: string;
  value?: string;
  lang?: string;
  depth?: number;
  name?: string;
  children?: MdNode[];
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
  data?: { estree?: unknown };
  url?: string;
  ordered?: boolean;
};

type PortableChild = {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
};

type PortableBlock = {
  _type: string;
  _key: string;
  [key: string]: unknown;
};

let keyCounter = 0;

function key(prefix = "k") {
  keyCounter += 1;
  return `${prefix}${keyCounter.toString(36)}`;
}

function slugFromFilename(file: string) {
  return path.basename(file, ".mdx").replace(/^_+/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mdxAttribute(node: MdNode, name: string) {
  const attr = node.attributes?.find((item) => item.name === name);
  if (!attr) return undefined;
  if (typeof attr.value === "string") return attr.value;
  if (attr.value && typeof attr.value === "object" && "value" in attr.value) {
    return String((attr.value as { value: unknown }).value);
  }
  return undefined;
}

function mdxExpressionAttribute(node: MdNode, name: string) {
  const attr = node.attributes?.find((item) => item.name === name);
  const value = attr?.value;
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  if ("value" in value && typeof (value as { value: unknown }).value === "string") {
    return (value as { value: string }).value.trim();
  }
  const data = (value as { data?: { estree?: { body?: unknown[] } } }).data;
  const body = data?.estree?.body;
  const expression = body?.[0] as
    | { expression?: { name?: string; value?: unknown } }
    | undefined;
  return expression?.expression?.name ?? expression?.expression?.value;
}

function extractImports(markdown: string) {
  const imports = new Map<string, string>();
  const importPattern = /^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']@\/assets\/([^"']+)["'];?/gm;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(markdown))) {
    imports.set(match[1], match[2]);
  }
  return imports;
}

function stripImports(markdown: string) {
  return markdown.replace(/^import\s.+$/gm, "").trim();
}

function textFrom(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textFrom).join("");
}

function span(text: string, marks: string[] = []): PortableChild[] {
  if (!text) return [];
  return [{ _type: "span", _key: key("s"), text, ...(marks.length ? { marks } : {}) }];
}

function inlineChildren(nodes: MdNode[] = [], marks: string[] = [], markDefs: unknown[] = []): PortableChild[] {
  return nodes.flatMap((node) => inlineNode(node, marks, markDefs));
}

function inlineNode(node: MdNode, marks: string[], markDefs: unknown[]): PortableChild[] {
  switch (node.type) {
    case "text":
      return span(node.value ?? "", marks);
    case "inlineCode":
      return span(node.value ?? "", [...marks, "code"]);
    case "strong":
      return inlineChildren(node.children, [...marks, "strong"], markDefs);
    case "emphasis":
      return inlineChildren(node.children, [...marks, "em"], markDefs);
    case "break":
      return span("\n", marks);
    case "link": {
      const markKey = key("m");
      markDefs.push({ _key: markKey, _type: "link", href: node.url });
      return inlineChildren(node.children, [...marks, markKey], markDefs);
    }
    case "mdxJsxTextElement":
      if (node.name === "Year") return span(String(new Date().getFullYear()), marks);
      return span(textFrom(node), marks);
    default:
      return inlineChildren(node.children, marks, markDefs);
  }
}

function textBlock(children: MdNode[], style = "normal", extra: Record<string, unknown> = {}): PortableBlock {
  const markDefs: unknown[] = [];
  return {
    _type: "block",
    _key: key("b"),
    style,
    children: inlineChildren(children, [], markDefs),
    markDefs,
    ...extra,
  };
}

function mediaValue(assetPath: string | undefined, alt: string | undefined) {
  if (!assetPath) return undefined;
  const filename = path.basename(assetPath);
  return {
    $media: {
      url: `${rawAssetBase}/${assetPath}`,
      filename,
      alt: alt ?? "",
    },
  };
}

function jsxElementToBlocks(node: MdNode, assetImports: Map<string, string>): PortableBlock[] {
  if (node.name === "OrangeAlert") {
    return [
      {
        _type: "orangeAlert",
        _key: key("alert"),
        title: mdxAttribute(node, "title") ?? "Note",
        message: mdxAttribute(node, "message") ?? textFrom(node),
      },
    ];
  }
  if (node.name === "Figure") {
    const srcIdentifier = mdxExpressionAttribute(node, "src");
    const assetPath = typeof srcIdentifier === "string" ? assetImports.get(srcIdentifier) : undefined;
    const alt = mdxAttribute(node, "alt") ?? "";
    return [
      {
        _type: "figure",
        _key: key("figure"),
        asset: mediaValue(assetPath, alt),
        alt,
        caption: textFrom(node),
      },
    ];
  }
  return [];
}

function paragraphBlocks(node: MdNode, assetImports: Map<string, string>): PortableBlock[] {
  const blocks: PortableBlock[] = [];
  let buffer: MdNode[] = [];

  const flush = () => {
    const text = buffer.map(textFrom).join("").trim();
    if (text) blocks.push(textBlock(buffer));
    buffer = [];
  };

  for (const child of node.children ?? []) {
    if (child.type === "mdxJsxTextElement" || child.type === "mdxJsxFlowElement") {
      const jsxBlocks = jsxElementToBlocks(child, assetImports);
      if (jsxBlocks.length) {
        flush();
        blocks.push(...jsxBlocks);
        continue;
      }
    }
    buffer.push(child);
  }
  flush();
  return blocks;
}

function blocksFromNode(node: MdNode, assetImports: Map<string, string>): PortableBlock[] {
  switch (node.type) {
    case "paragraph":
      return paragraphBlocks(node, assetImports);
    case "heading":
      return [textBlock(node.children ?? [], `h${node.depth ?? 2}`)];
    case "blockquote":
      return (node.children ?? []).flatMap((child) =>
        blocksFromNode(child, assetImports).map((block) => ({ ...block, style: "blockquote" })),
      );
    case "list":
      return (node.children ?? []).flatMap((item) =>
        (item.children ?? []).flatMap((child) =>
          blocksFromNode(child, assetImports).map((block) => ({
            ...block,
            listItem: node.ordered ? "number" : "bullet",
            level: 1,
          })),
        ),
      );
    case "code":
      return [{ _type: "code", _key: key("c"), language: node.lang, code: node.value ?? "" }];
    case "thematicBreak":
      return [{ _type: "break", _key: key("hr") }];
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement": {
      const jsxBlocks = jsxElementToBlocks(node, assetImports);
      if (jsxBlocks.length) return jsxBlocks;
      return [textBlock([{ type: "text", value: textFrom(node) }])];
    }
    default:
      return [];
  }
}

function toPortableText(markdown: string, assetImports: Map<string, string>) {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(stripImports(markdown)) as MdNode;
  return (tree.children ?? []).flatMap((node) => blocksFromNode(node, assetImports));
}

async function tagTerms() {
  const files = (await readdir(tagsDir)).filter((file) => file.endsWith(".mdx")).sort();
  return Promise.all(
    files.map(async (file) => {
      const source = await readFile(path.join(tagsDir, file), "utf8");
      const parsed = matter(source);
      return {
        slug: slugFromFilename(file),
        label: parsed.data.name ?? slugFromFilename(file),
        description: parsed.data.description ?? "",
      };
    }),
  );
}

async function blogEntries() {
  const files = (await readdir(blogDir)).filter((file) => file.endsWith(".mdx")).sort();
  return Promise.all(
    files.map(async (file) => {
      const source = await readFile(path.join(blogDir, file), "utf8");
      const parsed = matter(source);
      const slug = slugFromFilename(file);
      const imports = extractImports(parsed.content);
      const coverImport = typeof parsed.data.cover === "string"
        ? parsed.data.cover.match(/^@\/assets\/(.+)$/)?.[1]
        : undefined;

      return {
        id: `post-${slug}`,
        slug,
        status: file.startsWith("_") ? "draft" : "published",
        data: {
          title: parsed.data.title ?? slug,
          summary: parsed.data.summary ?? "",
          date: new Date(parsed.data.date).toISOString(),
          lastmod: parsed.data.lastmod ? new Date(parsed.data.lastmod).toISOString() : undefined,
          cover: mediaValue(coverImport, parsed.data.title),
          post_layout: parsed.data.postLayout ?? "column",
          canonical_url: parsed.data.canonicalUrl,
          related: [],
          content: toPortableText(parsed.content, imports),
        },
        taxonomies: {
          tag: (parsed.data.tags ?? ["default"]).map((tag: string | { slug?: string; id?: string }) =>
            typeof tag === "string" ? tag : (tag.slug ?? tag.id ?? "default"),
          ),
        },
        bylines: [{ byline: "byline-aj-dichmann", roleLabel: "Author" }],
      };
    }),
  );
}

async function main() {
  const [terms, posts] = await Promise.all([tagTerms(), blogEntries()]);
  const seed = {
    $schema: "https://emdashcms.com/seed.schema.json",
    version: "1",
    defaultLocale: "en",
    meta: {
      name: "AJ Dichmann Blog",
      description: "EmDash CMS seed generated from the original MDX blog.",
      author: "AJ Dichmann",
    },
    bylines: [
      {
        id: "byline-aj-dichmann",
        slug: "aj-dichmann",
        displayName: "AJ Dichmann",
        websiteUrl: "https://www.ajdichmann.com",
        isGuest: false,
      },
    ],
    collections: [
      {
        slug: "posts",
        label: "Posts",
        labelSingular: "Post",
        supports: ["drafts", "revisions", "preview", "scheduling", "search", "seo"],
        urlPattern: "/blog/{slug}/",
        routable: true,
        titleField: "title",
        dateField: "date",
        fields: [
          { slug: "title", label: "Title", type: "string", required: true, searchable: true },
          { slug: "summary", label: "Summary", type: "text", searchable: true },
          { slug: "date", label: "Date", type: "datetime", indexed: true },
          { slug: "lastmod", label: "Last modified", type: "datetime" },
          { slug: "cover", label: "Cover", type: "image" },
          {
            slug: "post_layout",
            label: "Post layout",
            type: "select",
            defaultValue: "column",
            options: { options: ["simple", "column"] },
          },
          { slug: "canonical_url", label: "Canonical URL", type: "url" },
          { slug: "related", label: "Related posts", type: "json" },
          { slug: "content", label: "Content", type: "portableText" },
        ],
      },
    ],
    taxonomies: [
      {
        name: "tag",
        label: "Tags",
        labelSingular: "Tag",
        hierarchical: false,
        collections: ["posts"],
        terms,
      },
    ],
    content: {
      posts,
    },
  };

  await mkdir(path.dirname(seedPath), { recursive: true });
  await writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
  console.log(`Wrote ${posts.length} posts and ${terms.length} tags to ${path.relative(repoRoot, seedPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
