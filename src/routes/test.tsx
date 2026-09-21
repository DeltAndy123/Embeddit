import { SeparatorSpacingSize } from "discord-api-types/v10";
import { Hono } from "hono";
import * as e from "@/embed/components";
import type { DiscordComponentEmbed } from "@/types/discord";
import { EmbedPage } from "@/views/EmbedPage";
import { DiscordComponentEmbedScript } from "@/views/JsonScript";

const app = new Hono();

app.get("/", (c) => {
  const payload: DiscordComponentEmbed = {
    component: e.container(
      [
        e.textDisplay("## [Test title](https://example.com)"),
        e.textDisplay(
          "Body with **bold**, ||spoiler|| and a list:\n- one\n- two",
        ),
        e.textDisplay(
          "Also a timestamp: <t:1700000000:R>\nAnd a [link](https://example.com)",
        ),
        e.section(["test"], e.thumbnail("https://picsum.photos/800/599")),
        e.mediaGallery([
          { url: "https://picsum.photos/800/600", description: "test image" },
          { url: "https://picsum.photos/800/601", spoiler: true },
          {
            url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
          },
        ]),
        e.separator({ spacing: SeparatorSpacingSize.Small }),
        e.textDisplay("**⬆️ 1.2k • 💬 340**"),
        e.actionRow([
          e.linkButton("GitHub", "https://github.com"),
          e.linkButton("Disabled link", "https://github.com", {
            disabled: true,
          }),
        ]),
      ],
      { accentColor: 0xff4500 },
    ),
  };

  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
        <meta property="og:title" content="Fallback title" />
        <meta property="og:description" content="Fallback description" />
        <meta property="og:image" content="https://picsum.photos/800/600" />
        <DiscordComponentEmbedScript data={payload} />
      </head>
      <body></body>
    </html>,
  );
});

app.get("/limits", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
        <DiscordComponentEmbedScript
          data={{
            component: e.container([
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.section(["test"], e.thumbnail("https://picsum.photos/800/600")),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
              e.mediaGallery([{ url: "https://picsum.photos/800/601" }]),
            ]),
          }}
        />
      </head>
      <body></body>
    </html>,
  );
});

app.get("/error", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
        <meta property="og:title" content="Fallback title" />
        <meta property="og:description" content="Fallback description" />
        <meta property="og:image" content="https://picsum.photos/800/600" />
        <DiscordComponentEmbedScript
          data={{
            component: e.container([e.textDisplay("Testing")]),
          }}
        />
      </head>
      <body></body>
    </html>,
  );
});

app.get("/gif", (c) => {
  return c.html(
    <EmbedPage
      embed={{
        component: e.container([
          e.section(
            ["test"],
            e.thumbnail("https://i.redd.it/mo0cia5cyrqh1.gif"),
          ),
          e.mediaGallery([
            {
              url: "https://i.redd.it/mo0cia5cyrqh1.gif",
            },
            {
              url: "https://i.redd.it/7y48da5cyrqh1.gif",
            },
          ]),
        ]),
      }}
    />,
  );
});

app.get("/length/:chars", (c) => {
  const chars = Number(c.req.param("chars"));
  const split = Number(c.req.query("split") ?? 1);
  const char = c.req.query("char") ?? "a";
  if (!Number.isInteger(chars) || chars < 3 || chars > 100_000) {
    return c.text("chars must be an integer from 3 to 100000", 400);
  }
  if (!Number.isInteger(split) || split < 1 || split > 20) {
    return c.text("split must be an integer from 1 to 20", 400);
  }
  if ([...char].length !== 1) {
    return c.text("char must be a single character", 400);
  }

  const each = Math.floor(chars / split);
  const displays = Array.from({ length: split }, () =>
    e.textDisplay(`${char.repeat(each - 3)}END`),
  );

  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
        <DiscordComponentEmbedScript
          data={{ component: e.container(displays) }}
        />
      </head>
      <body></body>
    </html>,
  );
});

export default app;
