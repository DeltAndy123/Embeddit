import { SeparatorSpacingSize } from "discord-api-types/v10";
import * as e from "@/embed/components";
import {
  accentColorOrDefault,
  footerLine,
  viewOnRedditButton,
} from "@/embed/parts";
import type { DeepReadonly } from "@/lib/cache";
import { discordTimestamp, formatNumber, TimestampStyle } from "@/lib/format";
import type { DiscordComponentEmbed } from "@/types/discord";
import type { RedditSubredditData } from "@/types/reddit";

export const buildSubredditEmbed = (
  subreddit: DeepReadonly<RedditSubredditData>,
): DiscordComponentEmbed => {
  const heading = `## ${subreddit.title}`;
  const stats = `**👥 ${formatNumber(subreddit.subscribers)} subscribers**`;
  // Empty text displays are invalid, so an empty description is left out
  const text: [string, string] | [string, string, string] =
    subreddit.public_description
      ? [heading, subreddit.public_description, stats]
      : [heading, stats];

  // Subreddits without an icon return empty strings, and a section needs an accessory
  const icon = subreddit.community_icon || subreddit.icon_img;

  return {
    component: e.container(
      [
        icon
          ? e.section(text, e.thumbnail(icon))
          : e.textDisplay(text.join("\n")),
        e.actionRow([viewOnRedditButton(subreddit.url)]),
        e.separator({ divider: true, spacing: SeparatorSpacingSize.Large }),
        footerLine(
          subreddit.display_name_prefixed,
          `Created at ${discordTimestamp(subreddit.created_utc, TimestampStyle.ShortDate)}`,
        ),
      ],
      { accentColor: accentColorOrDefault(subreddit.key_color) },
    ),
  };
};
