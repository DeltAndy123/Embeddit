import { describe, expect, test } from "bun:test";
import { ConfigError, DEFAULT_USER_AGENT, loadConfig } from "@/config";

const valid = {
  SERVER_BASE: "https://embeddit.example.com",
  REDDIT_CLIENT_ID: "id",
  REDDIT_CLIENT_SECRET: "secret",
};

const problemsFor = (env: Record<string, string | undefined>): string[] => {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  return [];
};

describe("loadConfig", () => {
  test("loads a valid config with defaults", () => {
    expect(loadConfig(valid)).toEqual({
      serverBase: "https://embeddit.example.com",
      port: 3000,
      reddit: {
        clientId: "id",
        clientSecret: "secret",
        userAgent: DEFAULT_USER_AGENT,
      },
    });
  });

  test("reads an explicit port and user agent", () => {
    const config = loadConfig({
      ...valid,
      PORT: "8080",
      REDDIT_USER_AGENT: "backend:mine:1.0 (by /u/me)",
    });

    expect(config.port).toBe(8080);
    expect(config.reddit.userAgent).toBe("backend:mine:1.0 (by /u/me)");
  });

  test("normalizes a trailing slash on SERVER_BASE", () => {
    expect(
      loadConfig({ ...valid, SERVER_BASE: "https://example.com/" }).serverBase,
    ).toBe("https://example.com");
  });

  test("reports every problem at once, and treats empty values as unset", () => {
    const problems = problemsFor({ SERVER_BASE: "", REDDIT_CLIENT_ID: " " });

    expect(problems).toEqual([
      "SERVER_BASE is required",
      "REDDIT_CLIENT_ID is required",
      "REDDIT_CLIENT_SECRET is required",
    ]);
  });

  test("rejects a SERVER_BASE Discord could not use", () => {
    for (const bad of [
      "http://embeddit.example.com",
      "https://localhost:3000",
      "https://127.0.0.1",
      "https://app.localhost",
      "https://example.com/some/path",
      "not a url",
    ]) {
      expect(problemsFor({ ...valid, SERVER_BASE: bad })).toHaveLength(1);
    }
  });

  test("rejects invalid ports", () => {
    for (const bad of ["0", "70000", "abc", "30.5", "-1"]) {
      expect(problemsFor({ ...valid, PORT: bad })).toHaveLength(1);
    }
  });

  test("the error message lists problems and never includes secret values", () => {
    const error = (() => {
      try {
        loadConfig({
          ...valid,
          SERVER_BASE: "http://x.com",
          REDDIT_CLIENT_SECRET: "hunter2",
        });
      } catch (e) {
        return e as ConfigError;
      }
    })();

    expect(error).toBeInstanceOf(ConfigError);
    expect(error?.message).toContain("SERVER_BASE must start with https://");
    expect(error?.message).not.toContain("hunter2");
  });
});
