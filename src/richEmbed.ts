import { Request, Response } from "express";
import { formatNumber } from "./util/num";
import { getRedditData } from "./util/api";
import {
  RedditAnyListing,
  RedditPostData,
  RedditPostListing,
  SubredditChild
} from "../types/reddit";
import { decodeObj } from "./util/encode";
import { logger } from "./util/log";

export function getStatuses(req: Request, res: Response): void {
  const rawId = req.params.id;
  const data = decodeObj(rawId);
  switch (data.type) {
    case "post":
      redditPost(data.id, req, res);
      break;
    case "sub":
      redditSubreddit(data.name, req, res);
      break;
    case "comment":
      redditComment(data.cId, data.pId, req, res);
  }
}

function getExtraPostInfo(post: RedditPostData): {
  appendFooter: string,
  footerLengthIncrease: number,
  appendContent: string,
  mediaAttachments: Record<string, any>[]
} {
  const mediaAttachments = [];
  if (post.post_hint === "image") {
    // Single image post (use for loop anyway just in case)
    for (const image of post.preview?.images || []) {
      mediaAttachments.push({
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
        mediaAttachments.push({
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
    return {
      appendFooter: " • <i>Embedded Videos Have No Audio</i>",
      footerLengthIncrease: " • Embedded Videos Have No Audio".length,
      appendContent: "",
      mediaAttachments: [{
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
      }]
    };
  } else if (post.post_hint === "link" || post.domain !== `self.${post.subreddit}`) {
    // Link post
    return {
      appendFooter: "",
      footerLengthIncrease: 0,
      appendContent: `<br><br><a href="${post.url}">${post.url}</a>`,
      mediaAttachments: []
    }
  }
  return {
    appendFooter: "",
    footerLengthIncrease: 0,
    appendContent: "",
    mediaAttachments
  }
}

async function redditPost(id: string, req: Request, res: Response): Promise<void> {
  const postResponse = await getRedditData<RedditPostListing>(`/api/info/?id=t3_${id}&raw_json=1`);
  const post = postResponse.data.data.children[0].data;
  const subredditResponse = await getRedditData<SubredditChild>(`/r/${post.subreddit}/about?raw_json=1`);
  const subreddit = subredditResponse.data.data;

  const json: Record<string, any> = { // TODO: Define a proper type for this
    id: req.params.id,
    url: "https://reddit.com" + post.permalink,
    uri: "https://reddit.com" + post.permalink,
    created_at: new Date(post.created_utc * 1000).toISOString(),
    language: subreddit.lang,
    account: {
      id: "1",
      display_name: `u/${post.author} (@ ${subreddit.display_name_prefixed})`,
      username: post.author,
      acct: post.author,
      url: "https://reddit.com/r/" + post.subreddit,
      uri: "https://reddit.com/r/" + post.subreddit,
      created_at: new Date(subreddit.created_utc * 1000).toISOString(),
      avatar: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
      avatar_static: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
    },
    content: "",
    visibility: "public",
    sensitive: false,
    spoiler_text: "",
    media_attachments: []
  };

  const scoreFormatted = formatNumber(post.score);
  const commentsFormatted = formatNumber(post.num_comments);

  let footer = `<div><b>⬆️ ${scoreFormatted} • 💬 ${commentsFormatted}`;
  // Length in Discord embed is based on the text itself, not including HTML tags
  let footerLength = "⬆️  • 💬 ".length + scoreFormatted.length + commentsFormatted.length;

  // Title
  json.content = `<a href="https://reddit.com${post.permalink}"><b>${post.title}</b></a>`;

  // Extra info (images, video, link)
  const extraPostInfo = getExtraPostInfo(post);
  json.media_attachments = extraPostInfo.mediaAttachments;
  json.content += extraPostInfo.appendContent;
  footer += extraPostInfo.appendFooter;
  footerLength += extraPostInfo.footerLengthIncrease;

  const maxSelftextLength = 1100 - footerLength; // Limit character length before Discord cuts it off so we have room for the footer

  // Body (selftext)
  const selftext_html = post.selftext_html
    ?.slice("<!-- SC_OFF --><div class=\"md\">".length, -"\n</div><!-- SC_ON -->".length) // Remove Reddit's extra HTML
  json.content += selftext_html ? `<br/><br/><div>${selftext_html}` : "";


  // Truncate if too much text
  if (json.content.length > maxSelftextLength) {
    let truncated = json.content.slice(0, maxSelftextLength);
    const lastOpenBracket = truncated.lastIndexOf('<');
    const lastCloseBracket = truncated.lastIndexOf('>');
    if (lastOpenBracket > lastCloseBracket) {
      // Remove incomplete tag
      truncated = truncated.slice(0, lastOpenBracket);
    }
    json.content = truncated + "…</b></a></strong></blockquote></li></ul></ol>"; // Truncate if too long
  }

  json.content += "</div>";

  // Footer
  footer += "</div>";
  json.content += `<br/><br/>${footer}`;

  res.json(json);
}

async function redditSubreddit(subName: string, req: Request, res: Response): Promise<void> {
  const subredditResponse = await getRedditData<SubredditChild>(`/r/${subName}/about?raw_json=1`);
  const subreddit = subredditResponse.data.data;

  const json: Record<string, any> = { // TODO: Define a proper type for this
    id: req.params.id,
    url: "https://reddit.com" + subreddit.url,
    uri: "https://reddit.com" + subreddit.url,
    created_at: new Date(subreddit.created_utc * 1000).toISOString(),
    language: subreddit.lang,
    account: {
      id: "1",
      display_name: `${subreddit.title} (@ ${subreddit.display_name_prefixed})`,
      username: subreddit.display_name_prefixed,
      acct: subreddit.display_name_prefixed,
      url: "https://reddit.com" + subreddit.url,
      uri: "https://reddit.com" + subreddit.url,
      created_at: new Date(subreddit.created_utc * 1000).toISOString(),
      avatar: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
      avatar_static: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
    },
    content: `${subreddit.public_description_html}`,
    visibility: "public",
    sensitive: false,
    spoiler_text: "",
    media_attachments: []
  };

  let footer = `<b>👥 ${formatNumber(subreddit.subscribers)}</b>`;
  json.content += footer

  res.json(json)
}

async function redditComment(commentId: string, postId: string, req: Request, res: Response): Promise<void> {
  const response = await getRedditData<RedditAnyListing>(`/api/info/?id=t1_${commentId},t3_${postId}&raw_json=1`);
  const commentChild = response.data.data.children[0];
  const postChild = response.data.data.children[1];
  if (commentChild.kind !== "t1") {
    logger.error(`Expected comment (type t1) at index 0 of listing, found type ${commentChild.kind}`);
    res.status(500).send("Internal Server Error");
    return;
  }
  if (postChild.kind !== "t3") {
    logger.error(`Expected post (type t3) at index 1 of listing, found type ${postChild.kind}`);
    res.status(500).send("Internal Server Error");
    return;
  }
  const comment = commentChild.data;
  const post = postChild.data;
  const subredditResponse = await getRedditData<SubredditChild>(`/r/${comment.subreddit}/about?raw_json=1`);
  const subreddit = subredditResponse.data.data;

  const json: Record<string, any> = { // TODO: Define a proper type for this
    id: req.params.id,
    url: "https://reddit.com" + comment.permalink,
    uri: "https://reddit.com" + comment.permalink,
    created_at: new Date(comment.created_utc * 1000).toISOString(),
    language: subreddit.lang,
    account: {
      id: "1",
      display_name: `u/${post.author} (@ ${subreddit.display_name_prefixed})`,
      username: post.author,
      acct: post.author,
      url: "https://reddit.com/r/" + comment.subreddit,
      uri: "https://reddit.com/r/" + comment.subreddit,
      created_at: new Date(subreddit.created_utc * 1000).toISOString(),
      avatar: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
      avatar_static: subreddit.community_icon || subreddit.icon_img || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png",
    },
    content: "",
    visibility: "public",
    sensitive: false,
    spoiler_text: "",
    media_attachments: []
  };

  const commentScoreFormatted = comment.score_hidden ? "-" : formatNumber(comment.score);
  let commentFooter = `<div><b>⬆️ ${commentScoreFormatted}</b></div>`;
  const commentFooterLength = `⬆️ ${commentScoreFormatted}`.length

  const postScoreFormatted = formatNumber(post.score);
  const postCommentsFormatted = formatNumber(post.num_comments);
  let postFooter = `<div><b>⬆️ ${postScoreFormatted} • 💬 ${postCommentsFormatted}`;
  let postFooterLength = "⬆️  • 💬 ".length + postScoreFormatted.length + postCommentsFormatted.length;

  const postSelftextHtml = post.selftext_html
      ?.slice("<!-- SC_OFF --><div class=\"md\">".length, -"\n</div><!-- SC_ON -->".length) // Remove Reddit's extra HTML

  // Title
  json.content = `<a href="https://reddit.com${post.permalink}"><b>${post.title}</b></a>`;

  let maxBodyLength = 700 - (1.35 * post.title.length) - commentFooterLength - postFooterLength;

  let body_html = comment.body_html
      ?.slice("<div class=\"md\">".length, -"\n</div>".length);

  let bodyLength = body_html.length;
  // Truncate comment body if too much text
  if (body_html.length > maxBodyLength) {
    let truncated = body_html.slice(0, maxBodyLength);
    const lastOpenBracket = truncated.lastIndexOf('<');
    const lastCloseBracket = truncated.lastIndexOf('>');
    if (lastOpenBracket > lastCloseBracket) {
      // Remove incomplete tag
      truncated = truncated.slice(0, lastOpenBracket);
    }
    let append = "…</b></a></strong></li></ul></ol>";
    if (truncated.includes("<blockquote>") && !truncated.includes("</blockquote>")) {
      // Only append a closing blockquote if needed for comments to not put footer outside of blockquote
      append = "…</b></a></strong></blockquote></li></ul></ol>";
    }
    body_html = truncated + append;
    bodyLength = truncated.length + 1;
  }
  const commentLength = bodyLength + commentFooterLength + `Comment by u/${comment.author}`.length;

  // Extra info (images, video, link)
  const extraPostInfo = getExtraPostInfo(post);
  json.media_attachments = extraPostInfo.mediaAttachments;
  json.content += extraPostInfo.appendContent;
  postFooter += extraPostInfo.appendFooter;
  postFooterLength += extraPostInfo.footerLengthIncrease;

  const maxSelftextLength = 865 - postFooterLength - commentLength;

  // Post body (selftext)
  json.content += postSelftextHtml ? `<br/><br/><div>${postSelftextHtml}` : "";

  // Truncate selftext if too much text
  if (json.content.length > maxSelftextLength) {
    let truncated = json.content.slice(0, maxSelftextLength);
    const lastOpenBracket = truncated.lastIndexOf('<');
    const lastCloseBracket = truncated.lastIndexOf('>');
    if (lastOpenBracket > lastCloseBracket) {
      // Remove incomplete tag
      truncated = truncated.slice(0, lastOpenBracket);
    }
    json.content = truncated + "…</b></a></strong></blockquote></li></ul></ol>"; // Truncate if too long
  }

  // Post footer
  postFooter += "</b></div>"
  json.content += "</div><br/><br/>" + postFooter;

  // Comment body
  json.content += `<br/><br/><div><blockquote><b><a href="https://reddit.com${comment.permalink}">Comment by u/${comment.author}</a></b><br/><br/>${body_html}${commentFooter}</blockquote></div>`;

  res.json(json);
}