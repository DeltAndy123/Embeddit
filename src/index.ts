import { Hono } from "hono";
import { ConfigError, loadConfig } from "@/config";
import { handleError, handleNotFound } from "@/errors";
import { logger } from "@/lib/log";
import { botOnly } from "@/middleware/botOnly";
import post from "@/routes/post";
import subreddit from "@/routes/subreddit";
import test from "@/routes/test";
import { type AppEnv, createServices } from "@/services";

const loadConfigOrExit = () => {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }
};

const config = loadConfigOrExit();
const services = createServices(config);

const app = new Hono<AppEnv>({ strict: false });

app.use(async (c, next) => {
  c.set("services", services);
  await next();
});

for (const path of ["/r/*", "/u/*", "/user/*"]) app.use(path, botOnly);

app.route("/test", test);
app.route("/", subreddit);
app.route("/", post);

app.get("/", (c) => c.redirect("https://github.com/DeltAndy123/Embeddit"));

app.onError(handleError);
app.notFound(handleNotFound);

logger.info(
  `Listening on port ${config.port} (public URL ${config.serverBase})`,
);

export default { port: config.port, fetch: app.fetch };
