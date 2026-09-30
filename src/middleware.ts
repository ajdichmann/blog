import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const { pathname } = url;
  const method = context.request.method.toUpperCase();

  const isEmDashPath = pathname.startsWith("/_emdash/");
  const isFile = !isEmDashPath && (pathname.split("/").pop()?.includes(".") ?? false);
  if (pathname.length > 1 && !pathname.endsWith("/") && !isFile) {
    url.pathname = `${pathname}/`;
    // 301 is fine for GET, but browsers convert POST+301 into GET and drop
    // the body. EmDash's setup wizard POSTs /_emdash/api/setup without a
    // trailing slash, so rewrite those requests internally instead.
    if (method === "GET" || method === "HEAD") {
      return context.redirect(url.toString(), 301);
    }
    return next(new Request(url, context.request));
  }

  return next();
});
