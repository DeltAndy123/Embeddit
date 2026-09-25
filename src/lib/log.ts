const isDebug = ["1", "true"].includes((process.env.DEBUG ?? "").toLowerCase());
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const tag = (label: string, color: string) =>
  useColor ? `${color}[${label}]\x1b[0m` : `[${label}]`;

export const logger = {
  info: (...message: unknown[]) =>
    console.log(tag("INFO", "\x1b[37m"), ...message),
  warn: (...message: unknown[]) =>
    console.warn(tag("WARN", "\x1b[33m"), ...message),
  error: (...message: unknown[]) =>
    console.error(tag("ERROR", "\x1b[31m"), ...message),
  debug: (...message: unknown[]) => {
    if (isDebug) console.log(tag("DEBUG", "\x1b[34m"), ...message);
  },
};
