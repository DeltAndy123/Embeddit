import "dotenv/config";

export const USER_AGENT = "backend:embeddit:1.0.0 (by /u/DeltAndy)";

if (!process.env.SERVER_BASE) {
  throw new Error("SERVER_BASE environment variable not set");
}
export const SERVER_BASE = process.env.SERVER_BASE;