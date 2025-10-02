import { DEBUG } from "../consts";

const RESET = "\x1b[0m";
const WHITE = "\x1b[37m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";

function logInfo(...message: any[]) {
  console.log(`${WHITE}[INFO]${RESET}`, ...message);
}

function logError(...message: any[]) {
  console.error(`${RED}[ERROR]${RESET}`, ...message);
}

function logWarn(...message: any[]) {
  console.warn(`${YELLOW}[WARN]${RESET}`, ...message);
}

function logDebug(...message: any[]) {
  if (DEBUG) console.log(`${BLUE}[DEBUG]${RESET}`, ...message);
}

export const logger = {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug
};