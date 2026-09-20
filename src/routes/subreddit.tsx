import { Hono } from "hono";
import * as e from "@/embed/components";
import { DiscordComponentEmbedScript } from "@/views/JSONScript";

const app = new Hono();

app.get("/r/:subreddit", (c) => {
  const subreddit = c.req.param("subreddit");

  return c.html(
    <html lang="en">
      <head>
        <DiscordComponentEmbedScript
          data={{
            component: e.container([e.textDisplay(`# r/${subreddit}`)], {
              accentColor: 0xff4500,
            }),
          }}
        />
      </head>
      <body>
        <h1>Subreddit: {subreddit}</h1>
      </body>
    </html>,
  );
});

export default app;
