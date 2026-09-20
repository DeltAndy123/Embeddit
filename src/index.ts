import { Hono } from "hono";
import { ConfigError, loadConfig } from "@/config";
import { logger } from "@/lib/log";
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

const app = new Hono<AppEnv>();

app.use(async (c, next) => {
  c.set("services", services);
  await next();
});

app.route("/test", test);
app.route("/", subreddit);

app.get("/", (c) => c.text("Hello World!"));

logger.info(
  `Listening on port ${config.port} (public URL ${config.serverBase})`,
);

export default { port: config.port, fetch: app.fetch };
