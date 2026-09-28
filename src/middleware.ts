import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const { pathname } = url;

  const isEmDashPath = pathname.startsWith("/_emdash/");
  const isFile = !isEmDashPath && (pathname.split("/").pop()?.includes(".") ?? false);
  if (pathname.length > 1 && !pathname.endsWith("/") && !isFile) {
    url.pathname = `${pathname}/`;
    return context.redirect(url.toString(), 301);
  }

  return next();
});
