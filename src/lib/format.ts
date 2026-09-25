const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatNumber = (num: number): string => compact.format(num);

/** Reddit timestamps such as `created_utc` are Unix seconds, often fractional */
export const fromUnixSeconds = (seconds: number): Date =>
  new Date(seconds * 1000);

/**
 * How Discord renders a `<t:UNIX:STYLE>` timestamp. Timestamps are evaluated
 * by each viewer's client, so the output follows their locale and timezone.
 */
export const TimestampStyle = {
  /**
   * Short time
   * - en-US: `4:20 PM`
   * - en-GB: `16:20`
   */
  ShortTime: "t",
  /**
   * Long time
   * - en-US: `4:20:30 PM`
   * - en-GB: `16:20:30`
   */
  LongTime: "T",
  /**
   * Short date
   * - en-US: `04/20/21`
   * - en-GB: `20/04/21`
   */
  ShortDate: "d",
  /**
   * Long date
   * - en-US: `April 20, 2021`
   * - en-GB: `20 April 2021`
   */
  LongDate: "D",
  /**
   * Short date with time
   * - en-US: `4/20/21, 4:20 PM`
   * - en-GB: `20/04/21, 16:20`
   */
  ShortDateShortTime: "s",
  /**
   * Short date with long time
   * - en-US: `4/20/21, 4:20:30 PM`
   * - en-GB: `20/04/21, 16:20:30`
   */
  ShortDateLongTime: "S",
  /**
   * Long date and time
   * - en-US: `April 20, 2021 at 4:20 PM`
   * - en-GB: `20 April 2021 at 16:20`
   */
  LongDateTime: "f",
  /**
   * Long date and time, with the weekday
   * - en-US: `Tuesday, April 20, 2021 at 4:20 PM`
   * - en-GB: `Tuesday, 20 April 2021 at 16:20`
   */
  WeekdayDateTime: "F",
  /**
   * Relative time (automatically kept up to date by the client)
   * - en-US & en-GB: `2 months ago`
   */
  Relative: "R",
} as const;

export type TimestampStyle =
  (typeof TimestampStyle)[keyof typeof TimestampStyle];

/**
 * Formats Unix seconds as Discord timestamp markdown for use in message and
 * component text.
 *
 * @example
 * discordTimestamp(1618935600); // "<t:1618935600:R>"
 * discordTimestamp(1618935600.9, TimestampStyle.LongDate); // "<t:1618935600:D>"
 */
export const discordTimestamp = (
  unixSeconds: number,
  style: TimestampStyle = TimestampStyle.Relative,
): string => `<t:${Math.floor(unixSeconds)}:${style}>`;
