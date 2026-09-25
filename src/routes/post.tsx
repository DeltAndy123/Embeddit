import { Hono } from "hono";
import { buildPostEmbed } from "@/embed/builders/post";
import type { AppEnv } from "@/services";
import { EmbedPage } from "@/views/EmbedPage";

const app = new Hono<AppEnv>();

app.get("/:kind{r|u|user}/:name/comments/:id/:title?", async (c) => {
  const reddit = c.get("services").reddit;
  const post = await reddit.getPost(c.req.param("id"));
  return c.html(<EmbedPage embed={await buildPostEmbed(post, reddit)} />);
});

export default app;
