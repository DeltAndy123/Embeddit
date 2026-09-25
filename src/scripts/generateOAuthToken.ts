import { OAuthClient } from "@/reddit/oauth";

const DEFAULT_USER_AGENT = "script:embeddit-token:2.0.0 (by /u/DeltAndy)";

// Status messages go to stderr so only the token is in stdout
const say = (message: string) => console.error(message);

const ask = (question: string) => prompt(question)?.trim() ?? "";

say("Reddit OAuth Token Generator\n");

const clientId =
  process.env.REDDIT_CLIENT_ID || ask("Enter your Reddit client ID:");
const clientSecret =
  process.env.REDDIT_CLIENT_SECRET || ask("Enter your Reddit client secret:");

if (!clientId || !clientSecret) {
  say("Error: Both client ID and secret are required.");
  process.exit(1);
}

const client = new OAuthClient({
  clientId,
  clientSecret,
  userAgent: process.env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
});

say("\nGenerating access token...");

try {
  const token = await client.getAccessToken();
  say("Access token generated successfully:\n");
  console.log(token);
} catch (error) {
  say(
    `Error generating access token: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
}
