import { assertValidEmbed } from "@/embed/validate";
import type { DiscordComponentEmbed } from "@/types/discord";
import { DiscordComponentEmbedScript } from "@/views/JsonScript";

export const EmbedPage = ({ embed }: { embed: DiscordComponentEmbed }) => {
  assertValidEmbed(embed);

  return (
    <html lang="en">
      <head>
        <DiscordComponentEmbedScript data={embed} />
      </head>
      <body></body>
    </html>
  );
};
