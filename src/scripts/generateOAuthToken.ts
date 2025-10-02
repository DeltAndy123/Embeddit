import readline from "node:readline";
import { OAuthClient } from "../util/oauth";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("Reddit OAuth Token Generator\n");

  const clientId = await prompt("Enter your Reddit client ID: ");
  const clientSecret = await prompt("Enter your Reddit client secret: ");

  if (!clientId || !clientSecret) {
    console.error("Error: Both client ID and secret are required.");
    rl.close();
    process.exit(1);
  }

  console.log("\nGenerating access token...\n");

  try {
    const oauthClient = new OAuthClient(clientId, clientSecret);
    const accessToken = await oauthClient.getAccessToken();

    console.log(" Access token generated successfully!\n");
    console.log("Your access token:");
    console.log(accessToken);

  } catch (error) {
    console.error("Error generating access token:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
