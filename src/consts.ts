import "dotenv/config";

export const USER_AGENT = "backend:embeddit:1.0.0 (by /u/DeltAndy)";

if (!process.env.SERVER_BASE) {
  throw new Error("SERVER_BASE environment variable not set");
}
if (!process.env.SERVER_BASE.startsWith("http")) {
  throw new Error("SERVER_BASE must start with http(s):// prefix")
}
if (process.env.SERVER_BASE.startsWith("http://localhost") || process.env.SERVER_BASE.startsWith("http://127.0.0.1")) {
  throw new Error("SERVER_BASE must not be a local URL, as Discord cannot fetch these. You must port forward and use your public IP address.")
}
export const SERVER_BASE = process.env.SERVER_BASE;