// Creates the EmDash "primary" (header) and "footer" menus on a running site
// from src/data/menus.json. Menus that already exist are left alone so edits
// made in the CMS are never overwritten.
//
// Usage:
//   node scripts/push-menus-to-emdash.mjs --url http://localhost:4321
//   npx emdash login --url https://www.ajdichmann.com   # once, opens a browser
//   node scripts/push-menus-to-emdash.mjs --url https://www.ajdichmann.com
//
// Auth: --token / EMDASH_TOKEN, else credentials saved by `emdash login`,
// else dev-bypass for localhost.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, isNotFound } from "./emdash-client.mjs";

async function main() {
  const client = createClient();
  const menus = JSON.parse(await readFile(path.join(process.cwd(), "src/data/menus.json"), "utf8"));

  for (const [name, { label, items }] of Object.entries(menus)) {
    try {
      await client.menu(name);
      console.log(`= ${name} (exists, left unchanged)`);
      continue;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    await client["request"]("POST", "/menus", { name, label });
    for (const [sortOrder, item] of items.entries()) {
      await client["request"]("POST", `/menus/${name}/items`, {
        type: "custom",
        label: item.label,
        customUrl: item.url,
        sortOrder,
      });
    }
    console.log(`+ ${name} (${items.length} items)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
