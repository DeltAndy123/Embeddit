import { raw } from "hono/html";
import type { DiscordComponentEmbed } from "@/types/discord";

const escapeJsonForScript = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

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
