import { Hono } from "hono";
import { buildSubredditEmbed } from "@/embed/builders/subreddit";
import type { AppEnv } from "@/services";
import { EmbedPage } from "@/views/EmbedPage";

const app = new Hono<AppEnv>();

app.get("/r/:subreddit", async (c) => {
  const subreddit = await c
    .get("services")
    .reddit.getSubreddit(c.req.param("subreddit"));

  return c.html(<EmbedPage embed={buildSubredditEmbed(subreddit)} />);
});

export default app;
