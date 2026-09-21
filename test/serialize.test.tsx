import { describe, expect, test } from "bun:test";
import { container, textDisplay } from "@/embed/components";
import { embedSize, escapeJsonForScript } from "@/embed/serialize";
import { DiscordComponentEmbedScript } from "@/views/JsonScript";

const embedOf = (text: string) => ({
  component: container([textDisplay(text)]),
});

describe("escapeJsonForScript", () => {
  test("escapes characters that could break out of a script tag", () => {
    expect(escapeJsonForScript({ t: "</script><b>&\u2028\u2029" })).toBe(
      '{"t":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026\\u2028\\u2029"}',
    );
  });
});

describe("embedSize", () => {
  test("matches the payload emitted in the script tag", () => {
    // Text that is escaped for the script tag, escaped by JSON, and non-ASCII
    const embed = embedOf('a < b & "c"\nd é 😀');
    const html = String(<DiscordComponentEmbedScript data={embed} />);
    const emitted = />(.*)<\/script>/s.exec(html)?.[1] ?? "";

    expect(embedSize(embed)).toBe(Buffer.byteLength(emitted));
  });

  test("measures the JSON structure plus the text", () => {
    // One text display adds 65 bytes of JSON around its text
    expect(embedSize(embedOf("a".repeat(2935)))).toBe(3000);
  });

  test("counts escapes and multi-byte characters in full", () => {
    expect(embedSize(embedOf("<"))).toBe(embedSize(embedOf("a")) + 5);
    expect(embedSize(embedOf("é"))).toBe(embedSize(embedOf("a")) + 1);
    expect(embedSize(embedOf("😀"))).toBe(embedSize(embedOf("a")) + 3);
  });
});
