import { SeparatorSpacingSize } from "discord-api-types/v10";
import * as e from "@/embed/components";
import { buildFittingEmbed } from "@/embed/fit";
import { fixMaskedLinks } from "@/embed/markdown";
import {
  accentColorOrDefault,
  EMOJIS,
  smallLine,
  viewOnRedditButton,
} from "@/embed/parts";
import type { DeepReadonly } from "@/lib/cache";
import { discordTimestamp, formatNumber, TimestampStyle } from "@/lib/format";
import type { RedditClient } from "@/reddit/client";
import { classifyPost } from "@/reddit/postKind";
import type {
  DiscordComponentEmbed,
  EmbedContainerChild,
} from "@/types/discord";
import type { RedditPostData } from "@/types/reddit";

export const buildPostEmbed = async (
  post: DeepReadonly<RedditPostData>,
  reddit: RedditClient,
): Promise<DiscordComponentEmbed> => {
  const subreddit = await reddit.getSubreddit(post.subreddit);
  const classified = classifyPost(post);
  const content =
    classified.kind === "crosspost" ? classified.content : classified;
  const source = classified.kind === "crosspost" ? classified.parent : post;

  const postContent: EmbedContainerChild[] = [];

  switch (content.kind) {
    case "image": {
      postContent.push(e.mediaGallery([{ url: content.url }]));
      break;
    }
    case "gallery": {
      const galleryLength = content.items.length;
      postContent.push(
        e.mediaGallery(
          content.items.map(
            (item, index): Parameters<typeof e.mediaGallery>[0][number] => ({
              url: item.url,
              description: `(${index + 1}/${galleryLength})${item.caption ? ` ${item.caption}` : ""}`,
            }),
          ),
        ),
      );
      break;
    }
    case "video": {
      postContent.push(e.mediaGallery([{ url: content.video.fallback_url }]));
      break;
    }
    case "link": {
      const urlWithoutProtocol = content.url.replace(/^https?:\/\//, "");
      if (content.preview) {
        postContent.push(
          e.section(
            [`[${urlWithoutProtocol}](${content.url})`],
            e.thumbnail(content.preview),
          ),
        );
      } else {
        postContent.push(
          e.textDisplay(`[${urlWithoutProtocol}](${content.url})`),
        );
      }
      break;
    }
  }

  const body = fixMaskedLinks(source.selftext.trim());

  // The payload has a size limit, so the body is cut to whatever room is left
  return buildFittingEmbed(body, (bodyText) => ({
    component: e.container(
      [
        smallLine(
          `in **[${subreddit.display_name_prefixed}](https://reddit.com${subreddit.url})**`,
          `by **[u/${post.author}](https://reddit.com/u/${post.author})**`,
        ),
        e.separator({ divider: true }),

        e.textDisplay(`### ${post.title}`),

        ...postContent,
        ...(bodyText ? [e.textDisplay(bodyText)] : []),

        e.separator({ divider: false }),
        e.textDisplay(
          `**${EMOJIS.UPVOTES}  ${formatNumber(post.score)}   •   ${EMOJIS.COMMENTS}  ${formatNumber(post.num_comments)}**`,
        ),
        e.actionRow([viewOnRedditButton(post.permalink)]),
        e.separator({ divider: true, spacing: SeparatorSpacingSize.Large }),
        smallLine(
          `Posted ${discordTimestamp(post.created_utc, TimestampStyle.Relative)}`,
          ...(classified.kind === "crosspost"
            ? [
                `Crossposted from **[${source.subreddit_name_prefixed}](https://reddit.com${source.permalink})**`,
              ]
            : []),
        ),
      ],
      { accentColor: accentColorOrDefault(subreddit.primary_color) },
    ),
  }));
};
