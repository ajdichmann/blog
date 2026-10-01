import { defineMiddleware } from "astro:middleware";

// Astro runs with trailingSlash: "ignore" so EmDash's admin and API routes
// (/_emdash/*) match however the admin client calls them. Public pages are
// still canonicalized to a trailing slash here, for GET/HEAD only, so form and
// API POSTs are never redirected (browsers turn POST+301 into a body-less GET).
export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;
  const method = context.request.method;

  const isInternal = pathname.startsWith("/_"); // /_emdash, /_astro, /_image, /_actions
  const isFile = pathname.split("/").pop()?.includes(".") ?? false;

  if (
    (method === "GET" || method === "HEAD") &&
    !isInternal &&
    !isFile &&
    !pathname.endsWith("/")
  ) {
    return context.redirect(`${pathname}/${search}`, 301);
  }

  return next();
});
