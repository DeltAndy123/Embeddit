import { describe, expect, test } from "bun:test";
import {
  discordTimestamp,
  formatNumber,
  fromUnixSeconds,
  TimestampStyle,
} from "@/lib/format";

describe("formatNumber", () => {
  test("leaves numbers under a thousand as they are", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(5)).toBe("5");
    expect(formatNumber(999)).toBe("999");
  });

  test("compacts thousands with at most one decimal", () => {
    expect(formatNumber(1_000)).toBe("1K");
    expect(formatNumber(1_500)).toBe("1.5K");
    expect(formatNumber(10_000)).toBe("10K");
    expect(formatNumber(12_500)).toBe("12.5K");
  });

  test("rounds instead of flooring at the boundaries", () => {
    expect(formatNumber(99_999)).toBe("100K");
    expect(formatNumber(999_999)).toBe("1M");
  });

  test("compacts millions and billions", () => {
    expect(formatNumber(1_000_000)).toBe("1M");
    expect(formatNumber(1_250_000)).toBe("1.3M");
    expect(formatNumber(2_500_000_000)).toBe("2.5B");
  });

  test("handles negative scores", () => {
    expect(formatNumber(-5)).toBe("-5");
    expect(formatNumber(-1_500)).toBe("-1.5K");
  });
});

describe("fromUnixSeconds", () => {
  test("converts Unix seconds to a Date", () => {
    expect(fromUnixSeconds(0).toISOString()).toBe("1970-01-01T00:00:00.000Z");
    expect(fromUnixSeconds(1_618_935_600).toISOString()).toBe(
      "2021-04-20T16:20:00.000Z",
    );
  });

  test("keeps fractional seconds", () => {
    expect(fromUnixSeconds(1_618_935_600.5).getTime()).toBe(1_618_935_600_500);
  });
});

describe("discordTimestamp", () => {
  test("defaults to the relative style", () => {
    expect(discordTimestamp(1_618_935_600)).toBe("<t:1618935600:R>");
  });

  test("floors fractional seconds", () => {
    expect(discordTimestamp(1_618_935_600.9)).toBe("<t:1618935600:R>");
  });

  test("uses the requested style", () => {
    expect(discordTimestamp(1_618_935_600, TimestampStyle.LongDate)).toBe(
      "<t:1618935600:D>",
    );
  });
});
