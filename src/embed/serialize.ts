import type { DiscordComponentEmbed } from "@/types/discord";

/**
 * JSON that is safe to put inside a <script> tag. The HTML parser reads script
 * content as raw text, and only two things can break out of it:
 * - `</script`, which closes the script tag
 * - `<!--` with a `<script>` tag, which can stop the </script> from closing the script tag
 *
 * `<` is written as a Unicode escape for these cases only.
 */
export const escapeJsonForScript = (data: unknown): string =>
  JSON.stringify(data).replace(/<(?=\/script|!--)/gi, "\\u003c");

/** Size of the payload exactly as it is emitted, in UTF-8 bytes (not characters) */
export const embedSize = (embed: DiscordComponentEmbed): number =>
  Buffer.byteLength(escapeJsonForScript(embed));
