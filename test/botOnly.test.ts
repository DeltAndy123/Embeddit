import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { botOnly } from "@/middleware/botOnly";

const setup = () => {
  const app = new Hono();
  app.use("/r/*", botOnly);
  app.get("/r/:subreddit", (c) => c.text("embed"));
  return app;
};

describe("botOnly", () => {
  test("lets Discord's crawler through to the embed route", async () => {
    const app = setup();
    const res = await app.request("/r/aww", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("embed");
  });

  test("redirects everyone else to Reddit", async () => {
    const app = setup();
    const res = await app.request("/r/aww?v=2", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.reddit.com/r/aww");
  });

  test("treats a missing user agent as non-Discord", async () => {
    const app = setup();
    const res = await app.request("/r/aww", { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.reddit.com/r/aww");
  });

  test("does not gate routes outside its mount path", async () => {
    const app = setup();
    app.get("/test", (c) => c.text("scratch"));

    const res = await app.request("/test", {
      headers: { "User-Agent": "curl/8.0" },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("scratch");
  });
});
