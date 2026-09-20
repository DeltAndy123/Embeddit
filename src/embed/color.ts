export const REDDIT_ORANGE = 0xff4500;

/**
 * Converts a 6-digit hex color such as `#ff4500` to the decimal integer
 * Discord expects for `accent_color`. Returns `undefined` for anything else.
 */
export const hexColorToDecimal = (hex: string): number | undefined => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return match?.[1] ? parseInt(match[1], 16) : undefined;
};
