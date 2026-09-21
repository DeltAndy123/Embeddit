import type { DiscordComponentEmbed } from "@/types/discord";

/**
 * JSON that is safe to put inside a <script> tag: `<`, `>`, `&` and the line
 * separators are written as \uXXXX so the data can't close the tag or break out.
 */
export const escapeJsonForScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/** Size of the payload exactly as it is emitted, in UTF-8 bytes (not characters) */
export const embedSize = (embed: DiscordComponentEmbed): number =>
  Buffer.byteLength(escapeJsonForScript(embed));
