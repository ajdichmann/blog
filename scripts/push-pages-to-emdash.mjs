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
import path from "node:path";
import { createClient, isNotFound } from "./emdash-client.mjs";
import { PAGES_COLLECTION } from "./pages-to-emdash.mjs";

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
