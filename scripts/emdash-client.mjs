// Shared EmDash client setup for the push-*-to-emdash scripts.
//
// Auth: --token / EMDASH_TOKEN, else credentials saved by `emdash login`,
// else dev-bypass for localhost.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { EmDashClient, EmDashApiError } from "emdash/client";

export function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

export const baseUrl = (arg("url") ?? "http://localhost:4321").replace(/\/$/, "");
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

export function createClient() {
  const token = arg("token") ?? process.env.EMDASH_TOKEN;
  if (token) return new EmDashClient({ baseUrl, token });
  const cred = storedCredential();
  if (cred) {
    return new EmDashClient({ baseUrl, token: cred.accessToken, refreshToken: cred.refreshToken });
  }
  if (isLocal) return new EmDashClient({ baseUrl, devBypass: true });
  throw new Error(`Not logged in to ${baseUrl}. Run: npx emdash login --url ${baseUrl}`);
}

export const isNotFound = (error) => error instanceof EmDashApiError && error.status === 404;
