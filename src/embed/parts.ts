import { hexColorToDecimal, REDDIT_ORANGE } from "@/embed/color";
import { linkButton, textDisplay } from "@/embed/components";

export const redditUrl = (path: string) => `https://reddit.com${path}`;

export const viewOnRedditButton = (path: string) =>
  linkButton("View on Reddit", redditUrl(path));

/** Accent color from a Reddit hex color, falling back to Reddit orange when unset */
export const accentColorOrDefault = (hex: string): number =>
  hexColorToDecimal(hex) ?? REDDIT_ORANGE;

/** Small gray text line, e.g. `-# r/example  •  Created at ...` */
export const smallLine = (...parts: string[]) =>
  textDisplay(`-# ${parts.join("  •  ")}`);

export const EMOJIS = {
  UPVOTES: "<:u:1551647045155291238>",
  COMMENTS: "<:c:1551647065585750123>",
} as const;
