export const DEFAULT_USER_AGENT = "backend:embeddit:2.0.0 (by /u/DeltAndy)";

export interface Config {
  serverBase: string;
  port: number;
  reddit: {
    clientId: string;
    clientSecret: string;
    userAgent: string;
  };
}

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {
  override name = "ConfigError";

  constructor(readonly problems: string[]) {
    super(
      `Invalid configuration:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
    );
  }
}

const isLocalHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "0.0.0.0" ||
  hostname === "[::1]" ||
  /^127\./.test(hostname);

// Empty values count as unset, since .env files often contain KEY=""
const read = (env: Env, key: string) => env[key]?.trim() || undefined;

const parseServerBase = (
  value: string | undefined,
  forceAllowHttp: boolean,
  problems: string[],
): string | undefined => {
  if (!value) {
    problems.push("SERVER_BASE is required");
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    problems.push(`SERVER_BASE is not a valid URL: ${value}`);
    return undefined;
  }

  if (
    url.protocol !== "https:" &&
    !(forceAllowHttp && url.protocol === "http:")
  ) {
    problems.push(
      "SERVER_BASE must start with https:// so Discord can fetch it",
    );
  } else if (isLocalHost(url.hostname)) {
    problems.push(
      "SERVER_BASE must be publicly reachable; Discord cannot fetch localhost (use a tunnel)",
    );
  } else if (url.pathname !== "/" || url.search || url.hash) {
    problems.push("SERVER_BASE must be a bare origin without a path or query");
  } else {
    return url.origin;
  }
  return undefined;
};

const parsePort = (value: string | undefined, problems: string[]): number => {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    problems.push(`PORT must be an integer between 1 and 65535, got: ${value}`);
    return 3000;
  }
  return port;
};

export const loadConfig = (env: Env = process.env): Config => {
  const problems: string[] = [];

  const forceAllowHttp = ["1", "true"].includes(
    (read(env, "FORCE_ALLOW_HTTP") ?? "0").toLowerCase(),
  );

  const serverBase = parseServerBase(
    read(env, "SERVER_BASE"),
    forceAllowHttp,
    problems,
  );
  const port = parsePort(read(env, "PORT"), problems);
  const clientId = read(env, "REDDIT_CLIENT_ID");
  const clientSecret = read(env, "REDDIT_CLIENT_SECRET");
  if (!clientId) problems.push("REDDIT_CLIENT_ID is required");
  if (!clientSecret) problems.push("REDDIT_CLIENT_SECRET is required");

  if (
    problems.length > 0 ||
    serverBase === undefined ||
    clientId === undefined ||
    clientSecret === undefined
  ) {
    throw new ConfigError(problems);
  }

  return {
    serverBase,
    port,
    reddit: {
      clientId,
      clientSecret,
      userAgent: read(env, "REDDIT_USER_AGENT") ?? DEFAULT_USER_AGENT,
    },
  };
};
