// Creates the EmDash "pages" collection and its entries on a running site,
// from the collection definition and src/data/pages.json. Existing entries
// are left alone so edits made in the CMS are never overwritten.
//
// Usage:
//   node scripts/push-pages-to-emdash.mjs --url http://localhost:4321
//   npx emdash login --url https://www.ajdichmann.com   # once, opens a browser
//   node scripts/push-pages-to-emdash.mjs --url https://www.ajdichmann.com
//
// Auth: --token / EMDASH_TOKEN, else credentials saved by `emdash login`,
// else dev-bypass for localhost.
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { EmDashClient, EmDashApiError } from "emdash/client";
import { PAGES_COLLECTION } from "./pages-to-emdash.mjs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const baseUrl = (arg("url") ?? "http://localhost:4321").replace(/\/$/, "");
const isLocal = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl);

function storedCredential() {
  const dir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, "emdash")
    : path.join(homedir(), ".config", "emdash");
  const file = path.join(dir, "auth.json");
  if (!existsSync(file)) return undefined;
  const store = JSON.parse(readFileSync(file, "utf8"));
  const origin = new URL(baseUrl).origin;
  return store[origin] ?? Object.values(store).find((c) => c.url && new URL(c.url).origin === origin);
}

function createClient() {
  const token = arg("token") ?? process.env.EMDASH_TOKEN;
  if (token) return new EmDashClient({ baseUrl, token });
  const cred = storedCredential();
  if (cred) {
    return new EmDashClient({ baseUrl, token: cred.accessToken, refreshToken: cred.refreshToken });
  }
  if (isLocal) return new EmDashClient({ baseUrl, devBypass: true });
  throw new Error(`Not logged in to ${baseUrl}. Run: npx emdash login --url ${baseUrl}`);
}

const isNotFound = (error) => error instanceof EmDashApiError && error.status === 404;

async function ensureCollection(client) {
  const { fields, titleField, ...collection } = PAGES_COLLECTION;
  let existing;
  try {
    existing = await client.collection(collection.slug);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  if (!existing) {
    await client["request"]("POST", "/schema/collections", collection);
    console.log(`Created collection "${collection.slug}"`);
    existing = { fields: [] };
  }

  const have = new Set(existing.fields.map((f) => f.slug));
  for (const [index, field] of fields.entries()) {
    if (have.has(field.slug)) continue;
    await client.createField(collection.slug, { ...field, sortOrder: index });
    console.log(`  + field ${field.slug}`);
  }

  if (titleField) {
    await client["request"]("PUT", `/schema/collections/${collection.slug}`, { titleField });
  }
}

async function main() {
  const client = createClient();
  await ensureCollection(client);

  const pages = JSON.parse(await readFile(path.join(process.cwd(), "src/data/pages.json"), "utf8"));
  for (const [slug, data] of Object.entries(pages)) {
    try {
      await client.get("pages", slug);
      console.log(`= ${slug} (exists, left unchanged)`);
      continue;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    const item = await client.create("pages", { slug, data });
    await client.publish("pages", item.id);
    console.log(`+ ${slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
