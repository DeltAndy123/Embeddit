import fs from "node:fs";
import path from "node:path";
import { CACHE_MAX_ENTRIES, DEBUG } from "../consts";
import { logger } from "./log";

const CACHE_FILE = path.join(__dirname, "..", "data", "cache.json");
let cache: Map<string, string> = new Map();

let cacheSaveCounter = 0;
let saveEntriesNeeded = 5; // Save cache to disk after every n new entries
if (DEBUG) saveEntriesNeeded = 1;

async function loadCache() {
  try {
    const data = await fs.promises.readFile(CACHE_FILE, "utf-8");
    cache = new Map(Object.entries(JSON.parse(data)));
    logger.info("Share link cache loaded with", cache.size, "entries");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.info("No share link cache found, starting with empty cache");
      cache = new Map();
    } else {
      logger.error("Error loading share link cache:", error);
    }
  }
}

async function saveCache() {
  try {
    await fs.promises.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.promises.writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)), "utf-8");
    logger.info("Share link cache saved with", cache.size, "entries");
  } catch (error) {
    logger.error("Error saving share link cache:", error);
  }
}

export function getFromCache(key: string): string | undefined {
  return cache.get(key);
}

export async function setInCache(key: string, value: string) {
  // Key: "[subreddit]:[share url id]", Value: actual url
  cache.set(key, value);
  if (cache.size > CACHE_MAX_ENTRIES) {
    // Remove oldest entry (first inserted)
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cacheSaveCounter++;
  if (cacheSaveCounter >= saveEntriesNeeded) {
    cacheSaveCounter = 0;
    await saveCache();
  }
}

loadCache();

process.on("exit", async () => {
  await saveCache();
});
process.on("SIGINT", async () => {
  await saveCache();
  process.exit();
});
process.on("SIGTERM", async () => {
  await saveCache();
  process.exit();
});