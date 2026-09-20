import { SeparatorSpacingSize } from "discord-api-types/v10";
import { Hono } from "hono";
import * as e from "@/embed/components";
import type { DiscordComponentEmbed } from "@/types/discord";
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
        e.mediaGallery([
          { url: "https://picsum.photos/800/600", description: "test image" },
          { url: "https://picsum.photos/800/601" },
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
      <body>
        <p>Test page</p>
      </body>
    </html>,
  );
});

export default app;
