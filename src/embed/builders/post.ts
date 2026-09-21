import { SeparatorSpacingSize } from "discord-api-types/v10";
import * as e from "@/embed/components";
import {
  accentColorOrDefault,
  smallLine,
  viewOnRedditButton,
} from "@/embed/parts";
import type { DeepReadonly } from "@/lib/cache";
import { discordTimestamp, TimestampStyle } from "@/lib/format";
import type { RedditClient } from "@/reddit/client";
import type { DiscordComponentEmbed } from "@/types/discord";
import type { RedditPostData } from "@/types/reddit";

export const buildPostEmbed = async (
  post: DeepReadonly<RedditPostData>,
  reddit: RedditClient,
): Promise<DiscordComponentEmbed> => {
  const subreddit = await reddit.getSubreddit(post.subreddit);

  return {
    component: e.container(
      [
        smallLine(
          `in **[${subreddit.display_name_prefixed}](https://reddit.com${subreddit.url})**`,
          `by **[u/${post.author}](https://reddit.com/u/${post.author})**`,
        ),
        e.textDisplay(`### ${post.title}`),
        e.textDisplay(post.selftext),

        e.actionRow([viewOnRedditButton(post.permalink)]),
        e.separator({ divider: true, spacing: SeparatorSpacingSize.Large }),
        smallLine(
          `Posted ${discordTimestamp(post.created_utc, TimestampStyle.Relative)}`,
        ),
      ],
      { accentColor: accentColorOrDefault(subreddit.key_color) },
    ),
  };
};
