import * as e from "@/embed/components";
import { viewOnRedditButton } from "@/embed/parts";
import type { DiscordComponentEmbed } from "@/types/discord";

const ERROR_RED = 0xed4245;

export interface ErrorEmbedOptions {
  title: string;
  message: string;
  /** Reddit path to offer as a "View on Reddit" button */
  path?: string;
}

export const buildErrorEmbed = ({
  title,
  message,
  path,
}: ErrorEmbedOptions): DiscordComponentEmbed => ({
  component: e.container(
    [
      e.textDisplay(`## ${title}\n${message}`),
      ...(path ? [e.actionRow([viewOnRedditButton(path)])] : []),
    ],
    { accentColor: ERROR_RED },
  ),
});
