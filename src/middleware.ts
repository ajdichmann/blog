import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  
  // If URL has a trailing slash and it's not the root path
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    // Remove the trailing slash
    url.pathname = url.pathname.slice(0, -1);
    
    // Return a redirect to the non-trailing slash version
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.toString()
      }
    });
  }
  
  return next();
}); 