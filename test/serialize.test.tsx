import { describe, expect, test } from "bun:test";
import { container, textDisplay } from "@/embed/components";
import { embedSize, escapeJsonForScript } from "@/embed/serialize";
import { DiscordComponentEmbedScript } from "@/views/JsonScript";

const embedOf = (text: string) => ({
  component: container([textDisplay(text)]),
});

// Reads a script tag the way an HTML parser does. Reports the script's text and
// whether the markup after it was still parsed as markup
const parseScript = async (json: string) => {
  let text = "";
  let afterSeen = false;
  await new HTMLRewriter()
    .on("script#x", {
      text: (chunk) => {
        text += chunk.text;
      },
    })
    .on("p#after", {
      element: () => {
        afterSeen = true;
      },
    })
    .transform(
      new Response(
        `<html><head><script id="x" type="application/json">${json}</script></head><body><p id="after">ok</p></body></html>`,
      ),
    )
    .text();
  return { text, afterSeen };
};

// Whether the JSON came through the parser intact and the page after it survived
const survives = async (json: string, expected: unknown) => {
  const { text, afterSeen } = await parseScript(json);
  try {
    return (
      afterSeen && JSON.stringify(JSON.parse(text)) === JSON.stringify(expected)
    );
  } catch {
    return false;
  }
};

const hostile = [
  "</script><p id=after>",
  "</SCRIPT >",
  "</Script/>",
  "</script",
  "<!--",
  "<!--<script>",
  "<!--<script></script>",
  "<!- - <script></script>",
  "<script>",
  "a < b > c & d",
  "<t:1700000000:R> <:emoji:123456789012345678>",
  "line\u2028separator\u2029",
];

// Seeded, so a failure is reproducible
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const pieces = [
  "<",
  "/",
  "!",
  "-",
  "--",
  ">",
  " ",
  "\n",
  '"',
  "&",
  "\\",
  "a",
  "script",
  "SCRIPT",
  "Script",
  "<!--",
  "</script",
  "<script",
  "-->",
  "</",
  "<!",
];

const randomTexts = (count: number) => {
  const next = seeded(1);
  return Array.from({ length: count }, () =>
    Array.from(
      { length: 1 + Math.floor(next() * 8) },
      () => pieces[Math.floor(next() * pieces.length)],
    ).join(""),
  );
};

const brokenBy = async (
  serialize: (data: unknown) => string,
  texts: string[],
) => {
  const broken: string[] = [];
  for (const t of texts) {
    if (!(await survives(serialize({ t }), { t }))) broken.push(t);
  }
  return broken;
};

describe("escapeJsonForScript", () => {
  test("only escapes `<` when it starts `</script` or `<!--`", () => {
    expect(
      escapeJsonForScript({ t: "a < b > c & d <t:1:R> </b> <!- <script>" }),
    ).toBe('{"t":"a < b > c & d <t:1:R> </b> <!- <script>"}');
    expect(escapeJsonForScript({ t: "</script>" })).toBe(
      '{"t":"\\u003c/script>"}',
    );
    expect(escapeJsonForScript({ t: "</SCRIPT " })).toBe(
      '{"t":"\\u003c/SCRIPT "}',
    );
    expect(escapeJsonForScript({ t: "<!--" })).toBe('{"t":"\\u003c!--"}');
  });

  test.each(hostile)("%j stays intact inside a script tag", async (input) => {
    expect(
      await survives(escapeJsonForScript({ t: input }), { t: input }),
    ).toBe(true);
  });

  test("random script-like text stays intact inside a script tag", async () => {
    expect(await brokenBy(escapeJsonForScript, randomTexts(1500))).toEqual([]);
  });

  // Proves the tests above can fail: without escaping, the same inputs break the page
  test("unescaped JSON does break out of a script tag", async () => {
    const broken = await brokenBy(JSON.stringify, [
      ...hostile,
      ...randomTexts(1500),
    ]);

    expect(broken).toContain("</script><p id=after>");
    expect(broken).toContain("<!--<script>");
    expect(broken.length).toBeGreaterThan(20);
  });
});

describe("embedSize", () => {
  test("matches the payload emitted in the script tag", () => {
    // Text that needs escaping, JSON escaping, and non-ASCII
    const embed = embedOf('a </script b & "c"\nd é 😀');
    const html = String(<DiscordComponentEmbedScript data={embed} />);
    const emitted = />(.*)<\/script>/s.exec(html)?.[1] ?? "";

    expect(embedSize(embed)).toBe(Buffer.byteLength(emitted));
  });

  test("measures the JSON structure plus the text", () => {
    // One text display adds 65 bytes of JSON around its text
    expect(embedSize(embedOf("a".repeat(2935)))).toBe(3000);
  });

  test("counts multi-byte characters and escapes in full", () => {
    const one = embedSize(embedOf("a"));

    expect(embedSize(embedOf("é"))).toBe(one + 1);
    expect(embedSize(embedOf("😀"))).toBe(one + 3);
    // Same length as "a/script" but its "<" is written as a six byte escape
    expect(embedSize(embedOf("</script"))).toBe(
      embedSize(embedOf("a/script")) + 5,
    );
  });

  test("leaves everything else unescaped so it costs its own size", () => {
    const one = embedSize(embedOf("a"));

    for (const char of ["<", ">", "&"]) {
      expect(embedSize(embedOf(char))).toBe(one);
    }
    expect(embedSize(embedOf("</b>"))).toBe(one + 3);
  });
});
