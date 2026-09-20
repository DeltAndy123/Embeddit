import { Hono } from "hono";
import subreddit from "@/routes/subreddit";
import test from "@/routes/test";

const app = new Hono();

app.route("/test", test);
app.route("/", subreddit);

app.get("/", (c) => c.text("Hello World!"));

export default app;
