import { MAX_EMBED_SIZE } from "@/embed/components";
import { embedSize } from "@/embed/serialize";
import type { DiscordComponentEmbed } from "@/types/discord";

const ELLIPSIS = "…";

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;

const truncate = (text: string, length: number): string => {
  if (length >= text.length) return text;
  // Cutting between the two halves of an emoji would leave a broken character
  const end = isHighSurrogate(text.charCodeAt(length - 1))
    ? length - 1
    : length;
  return `${text.slice(0, end).trimEnd()}${ELLIPSIS}`;
};

/**
 * Builds an embed with `text` cut to the longest prefix that keeps the payload
 * within the size limit, ending in an ellipsis when it was cut.
 *
 * The size is measured on the real output and not estimated from the text
 * length, because escaped characters (quotes, newlines, `<`) take several
 * characters of JSON and everything else in the embed uses up room too.
 *
 * `build` gets "" when nothing of the text fits and must leave it out then. If
 * the embed is too big even without the text, that result is returned and
 * `assertValidEmbed` reports it.
 */
export const buildFittingEmbed = (
  text: string,
  build: (text: string) => DiscordComponentEmbed,
): DiscordComponentEmbed => {
  const full = build(text);
  if (embedSize(full) <= MAX_EMBED_SIZE) return full;

  // The size only grows with the prefix length, so this can be binary searched.
  // Invariant: a prefix of `low` characters fits (0 means no text), `high` doesn't.
  let low = 0;
  let high = text.length;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (embedSize(build(truncate(text, mid))) <= MAX_EMBED_SIZE) low = mid;
    else high = mid;
  }
  return build(low === 0 ? "" : truncate(text, low));
};
