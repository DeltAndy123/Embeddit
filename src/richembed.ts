import { Request, Response } from "express";
import { formatNumber } from "./util/num";
import { getRedditData } from "./util/api";
import { RedditPostListing, RedditSubredditListing } from "../types/reddit";

export function getStatuses(req: Request, res: Response): void {
  const rawId = req.params.id;
  // Sample rawId: t31n7fp0m
  // Convert this to Reddit API fullname (t3_1n7fp0m)
  // 1n7fp0m
  const id = rawId.slice(2);
  // t3
  const type = rawId.slice(0, 2);

  if (type === "t3") {
    // Reddit post
    redditPost(id, req, res);
  }
}

async function redditPost(id: string, req: Request, res: Response): Promise<void> {
  const postResponse = await getRedditData<RedditPostListing>(`/api/info/?id=t3_${id}&raw_json=1`);
  const post = postResponse.data.data.children[0].data;
  const subredditResponse = await getRedditData<RedditSubredditListing>(`/r/${post.subreddit}/about?raw_json=1`);
  const subreddit = subredditResponse.data.data;

  const json: Record<string, any> = { // TODO: Define a proper type for this
    id: req.params.id,
    url: "https://reddit.com" + post.permalink,
    uri: "https://reddit.com" + post.permalink,
    created_at: new Date(post.created_utc * 1000).toISOString(),
    language: "en",
    account: {
      id: "1",
      display_name: `u/${post.author} (@ ${subreddit.display_name_prefixed})`,
      username: post.author,
      acct: post.author,
      url: "https://reddit.com/r/" + post.subreddit,
      uri: "https://reddit.com/r/" + post.subreddit,
      created_at: new Date().toISOString(),
      avatar: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
      avatar_static: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
    },
    content: "",
    visibility: "public",
    sensitive: false,
    spoiler_text: "",
    media_attachments: []
  };

  let footer = `</a><b>⬆️ ${formatNumber(post.score)} • 💬 ${formatNumber(post.num_comments)}`;
  // Length in Discord embed is based on the text itself, not including HTML tags
  let footerLength = "⬆️  • 💬 ".length + post.score.toString().length + post.num_comments.toString().length;


  json.content = `<a href="https://reddit.com${post.permalink}"><b>${post.title}</b></a>`;


  if (post.post_hint === "image") {
    // Single image post (use for loop anyway just in case)
    for (const image of post.preview?.images || []) {
      json.media_attachments.push({
        id: image.id,
        type: "image",
        url: image.source.url,
        preview_url: image.source.url,
        remote_url: null,
        preview_remote_url: null,
        text_url: null,
        meta: {
          original: {
            width: image.source.width || 0,
            height: image.source.height || 0,
            size: `${image.source.width || 0}x${image.source.height || 0}`,
            aspect: image.source.width && image.source.height
              ? image.source.width / image.source.height
              : 0
          },
          small: {
            width: image.resolutions[0]?.width || 0,
            height: image.resolutions[0]?.height || 0,
            size: `${image.resolutions[0]?.width || 0}x${image.resolutions[0]?.height || 0}`,
            aspect: image.resolutions[0]?.width && image.resolutions[0]?.height
              ? image.resolutions[0].width / image.resolutions[0].height
              : 0
          }
        },
        description: post.title
      });
    }
  } else if (post.media_metadata) {
    // Gallery post
    for (const key in post.media_metadata) {
      const media = post.media_metadata[key];
      if (media.e === "Image") {
        const source = media.s;
        json.media_attachments.push({
          id: key,
          type: "image",
          url: source.u,
          preview_url: source.u,
          remote_url: null,
          preview_remote_url: null,
          text_url: null,
          meta: {
            original: {
              width: source.x || 0,
              height: source.y || 0,
              size: `${source.x || 0}x${source.y || 0}`,
              aspect: source.x && source.y ? source.x / source.y : 0
            },
            small: {
              width: source.x ? Math.min(source.x, 320) : 0,
              height: source.y ? Math.min(source.y, 320) : 0,
              size: `${source.x ? Math.min(source.x, 320) : 0}x${source.y ? Math.min(source.y, 320) : 0}`,
              aspect: source.x && source.y ? source.x / source.y : 0
            }
          },
          description: post.title
        });
      }
    }
  } else if (post.post_hint === "hosted:video" && post.media?.reddit_video) {
    // Video post
    const video = post.media.reddit_video;
    json.media_attachments.push({
      id: post.id,
      type: "video",
      url: video.fallback_url,
      preview_url: post.preview?.images[0]?.source.url || "",
      remote_url: null,
      preview_remote_url: null,
      text_url: null,
      description: post.title,
      meta: {
        original: {
          width: video.width || 0,
          height: video.height || 0,
          size: `${video.width || 0}x${video.height || 0}`,
          aspect: video.width && video.height ? video.width / video.height : 0,
        }
      }
    });
    footer += " • <i>Embedded Videos Have No Audio</i>";
    footerLength += " • Embedded Videos Have No Audio".length;
  } else if (post.post_hint === "link" || post.domain !== `self.${post.subreddit}`) {
    // Link post
    json.content += `<br><br><a href="${post.url}">${post.url}</a>`;
  }

  footer += "</b>";
  const maxBodyLength = 1098 - footerLength; // Limit character length before Discord cuts it off so we have room for the footer

  const selftext_html = post.selftext_html
    ?.slice("<!-- SC_OFF --><div class=\"md\">".length, -"\n</div><!-- SC_ON -->".length) // Remove Reddit's extra HTML

  json.content += `${selftext_html ? `<br><br>${selftext_html}` : "<br><br>"}`;
  if (json.content.length > maxBodyLength) {
    // Truncate and remove any incomplete HTML tag at the end
    let truncated = json.content.slice(0, maxBodyLength);
    const lastOpenBracket = truncated.lastIndexOf('<');
    const lastCloseBracket = truncated.lastIndexOf('>');
    if (lastOpenBracket > lastCloseBracket) {
      // Remove incomplete tag
      truncated = truncated.slice(0, lastOpenBracket);
    }
    json.content = truncated + "…</a></b><br><br>"; // Truncate if too long
  }
  json.content += footer;

  res.json(json);
}