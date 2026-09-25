import { SeparatorSpacingSize } from "discord-api-types/v10";
import { Hono } from "hono";
import { buildErrorEmbed } from "@/embed/builders/error";
import * as e from "@/embed/components";
import type { DiscordComponentEmbed } from "@/types/discord";
import { EmbedPage } from "@/views/EmbedPage";

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

  return c.html(<EmbedPage embed={payload} />);
});

app.get("/limits", (c) => {
  return c.html(
    <EmbedPage
      embed={{
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
    />,
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

  return c.html(<EmbedPage embed={{ component: e.container(displays) }} />);
});

app.get("/custom_emoji", (c) => {
  const emojiId = c.req.query("id");
  if (!emojiId) {
    return c.html(
      <EmbedPage
        embed={buildErrorEmbed({
          title: "Missing 'id' query parameter",
          message:
            "Please provide a custom emoji ID in the query string, e.g. /custom_emoji?id=123456789012345678",
        })}
      />,
    );
  }

  return c.html(
    <EmbedPage
      embed={{
        component: e.container([e.textDisplay(`# <:custom_emoji:${emojiId}>`)]),
      }}
    />,
  );
});

export default app;
