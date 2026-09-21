// `[label](url)`. The url allows escaped characters and one level of balanced
// parentheses, e.g. https://en.wikipedia.org/wiki/Foo_(bar)
const MASKED_LINK = /\[([^\]]*)\]\(((?:\\.|[^()\s\\]|\([^()\s]*\))+)\)/g;
const HAS_SCHEME = /https?:\/\//i;
const SCHEME = /https?:\/\//gi;

/**
 * Discord won't render a masked link whose visible text contains `http://` or
 * `https://` anywhere; the raw `[text](url)` is shown instead. Reddit produces
 * these whenever someone pastes a bare URL, so the scheme is dropped from the
 * label and the link keeps working. Doesn't skip code spans.
 */
export const fixMaskedLinks = (markdown: string): string =>
  markdown.replace(MASKED_LINK, (match, label: string, url: string) => {
    if (!HAS_SCHEME.test(label)) return match;
    const text = label.replace(SCHEME, "") || url.replace(SCHEME, "");
    return `[${text}](${url})`;
  });
