import { raw } from "hono/html";
import { escapeJsonForScript } from "@/embed/serialize";
import type { DiscordComponentEmbed } from "@/types/discord";

export const JsonScript = ({ id, data }: { id: string; data: unknown }) => (
  <script id={id} type="application/json">
    {raw(escapeJsonForScript(data))}
  </script>
);

export const DiscordComponentEmbedScript = ({
  data,
}: {
  data: DiscordComponentEmbed;
}) => (
  <script id="discord:component-embed" type="application/json">
    {raw(escapeJsonForScript(data))}
  </script>
);
