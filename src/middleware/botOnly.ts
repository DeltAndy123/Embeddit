import { createMiddleware } from "hono/factory";

// Discord's crawler sends this user agent when unfurling a link. Everyone
// else should be sent straight to Reddit instead of seeing the embed page's
// raw component JSON.
// Current user agent Discord uses (9/20/2026): "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
const DISCORDBOT_UA = /Discordbot/i;

export const botOnly = createMiddleware(async (c, next) => {
  const userAgent = c.req.header("User-Agent") ?? "";
  if (!DISCORDBOT_UA.test(userAgent)) {
    // Drop our own query string (e.g. the `?v=2` cache-busting trick)
    return c.redirect(`https://www.reddit.com${c.req.path}`, 302);
  }
  await next();
});
