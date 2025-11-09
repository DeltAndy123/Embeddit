import express, { Response } from "express";
import useragent from "express-useragent";
import {
  RedditCommentData,
  RedditPostData,
  RedditPostListing,
  SubredditChild,
  RedditSubredditData, RedditAnyListing
} from "../types/reddit";
import { getStatuses } from "./richEmbed";
import { SERVER_BASE } from "./consts";
import { getRedditData, resolveShareLink } from "./util/api";
import { AxiosResponse } from "axios";
import { logger } from "./util/log";
import { encodeObj } from "./util/encode";
import { convert } from "./util/video";
import https from "node:https";
import fs from "node:fs";

const port = process.env.PORT || 3000;

const app = express();
app.use(useragent.express());
app.use(express.static("public"));
app.set("view engine", "ejs");

function postToOptions(post: RedditPostData, mergeAudio: boolean) {
  return {
    permalink: `https://reddit.com${post.permalink}`,
    title: post.title,
    author: post.author,
    subreddit: post.subreddit_name_prefixed,
    body: post.selftext,
    statusId: encodeObj({
      type: "post",
      id: post.id,
      merge: mergeAudio
    }),
    image_url: post.url // TODO: Add image for direct (non-Mastodon) embeds
  }
}

function commentToOptions(comment: RedditCommentData, post: RedditPostData, mergeAudio: boolean) {
  return {
    permalink: `https://reddit.com${comment.permalink}`,
    title: post.title,
    author: comment.author,
    subreddit: comment.subreddit_name_prefixed,
    body: comment.body,
    statusId: encodeObj({
      type: "comment",
      cId: comment.id,
      pId: post.id,
      merge: mergeAudio
    })
  }
}

function subredditToOptions(subreddit: RedditSubredditData) {
  return {
    permalink: `https://reddit.com${subreddit.url}`,
    title: subreddit.title,
    subreddit: subreddit.display_name,
    body: subreddit.description,
    statusId: encodeObj({
      type: "sub",
      name: subreddit.display_name
    })
  }
}

function renderRedditPost(id: string, res: Response, mergeAudio?: boolean) {
  getRedditData(`/api/info/?id=t3_${id}&raw_json=1`)
      .then((response: AxiosResponse<RedditPostListing>) => {
        const post = response.data.data.children[0].data;
        res.render("post", {
          ...postToOptions(post, !!mergeAudio),
          server_base: SERVER_BASE
        });
      })
      .catch((error) => {
        logger.error("Failed to fetch Reddit post data:", error);
        res.status(500).send("Internal Server Error");
      });
}

async function renderRedditComment(commentId: string, postId: string, res: Response, mergeAudio?: boolean) {
  try {
    const response = await getRedditData<RedditAnyListing>(`/api/info/?id=t1_${commentId},t3_${postId}&raw_json=1`);
    const comment = response.data.data.children[0];
    const post = response.data.data.children[1];
    if (comment.kind !== "t1") {
      logger.error(`Expected comment (type t1) at index 0 of listing, found type ${comment.kind}`);
      return;
    }
    if (post.kind !== "t3") {
      logger.error(`Expected post (type t3) at index 1 of listing, found type ${post.kind}`);
      return;
    }
    res.render("comment", {
      ...commentToOptions(comment.data, post.data, !!mergeAudio),
      server_base: SERVER_BASE
    });
  } catch (error) {
    logger.error("Failed to fetch Reddit comment or post data:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Reddit Posts
// Example:
// https://www.reddit.com/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/
// (or http://localhost:3000/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/)
app.get([
    "/r/:subreddit/comments/:id/:title",
    "/user/:user/comments/:id/:title",
    "/u/:user/comments/:id/:title"
], async (req, res) => {
  if (req.useragent?.isBot) {
    logger.debug("Reddit post request from", req.useragent?.source);

    const { id } = req.params;
    renderRedditPost(id, res, !!req.query.audio);
  } else {
    res.redirect(`https://reddit.com${req.path}`);
  }
});

// Gallery links (redirects to posts)
app.get("/gallery/:id", async (req, res) => {
  if (req.useragent?.isBot) {
    logger.debug("Reddit (gallery) post request from", req.useragent?.source);

    const { id } = req.params;
    renderRedditPost(id, res, !!req.query.audio);
  } else {
    res.redirect(`https://reddit.com${req.path}`);
  }
});

// Comments
app.get("/r/:subreddit/comments/:postId/:title/:commentId", async (req, res) => {
  if (req.useragent?.isBot) {
    logger.debug("Reddit comment request from", req.useragent?.source);

    const { postId, commentId } = req.params;
    await renderRedditComment(commentId, postId, res, !!req.query.audio);
  } else {
    res.redirect(`https://reddit.com${req.path}`);
  }
});

// Reddit share (/s/) URLs (https://reddit.com/r/[subreddit]/s/[id])
app.get("/r/:subreddit/s/:id", async (req, res) => {
  const { subreddit, id } = req.params;

  if (req.useragent?.isBot) {
    logger.debug("Reddit share link request from", req.useragent?.source);
    resolveShareLink(subreddit, id)
        .then(async (url) => {
          if (!url) {
            res.status(404).send("Not Found");
            return;
          }
          const urlObj = new URL(url);
          const urlPath = urlObj.pathname.split("/")
          const postId = urlPath[4];
          const commentId = urlPath[6];
          if (commentId) {
            // Share link redirected to a comment
            await renderRedditComment(commentId, postId, res, !!req.query.audio);
          } else {
            // Share link redirected to a post
            renderRedditPost(postId, res, !!req.query.audio);
          }
        })
        .catch((error) => {
          logger.error(`Share link resolution failed for ${req.path}:`, error);
          res.status(500).send("Internal Server Error");
        });
  } else {
    // Redirect to actual URL without tracking parameters
    try {
      const link = await resolveShareLink(subreddit, id);
      if (link) {
        logger.debug(`Redirecting user to resolved share link for ${req.path}: ${link}`);
        res.redirect(link);
      } else {
        // Error occurred trying to resolve share link, just redirect to the original URL
        logger.warn(`Share link resolution failed for ${req.path}, falling back to original URL`);
        res.redirect(`https://reddit.com${req.path}`);
      }
    } catch (error) {
      logger.error(`Share link resolution failed for ${req.path}, falling back to original URL:`, error);
      res.redirect(`https://reddit.com${req.path}`);
    }
  }
});

// Subreddits
app.get("/r/:subreddit", async (req, res) => {
  if (req.useragent?.isBot) {
    logger.debug("Reddit subreddit request from", req.useragent?.source);

    const { subreddit } = req.params;
    getRedditData(`/r/${subreddit}/about?raw_json=1`)
        .then((response: AxiosResponse<SubredditChild>) => {
          res.render("subreddit", {
            ...subredditToOptions(response.data.data),
            server_base: SERVER_BASE
          });
        });
  } else {
    res.redirect(`https://reddit.com${req.path}`)
  }
});


// Spoof as a Mastodon post so Discord allows rich embeds instead of normal links
// http://localhost:3000/users/TeamCherryGames/statuses/66086667665361575960535460605659595556555558585966
app.get("/users/:username/statuses/:id", async (req, res) => {
  logger.debug("Mastodon spoof request from", req.useragent?.source);

  // TODO: Redirect to real URL
  res.redirect("https://google.com");
});
// Discord will see above link and use /api/v1/statuses/66086667665361575960535460605659595556555558585966
// to fetch the post data, so handle that
app.get("/api/v1/statuses/:id", async (req, res) => {
  logger.debug("Mastodon API request from", req.useragent?.source);

  getStatuses(req, res);
});


app.get("/video/:id/:videoName.mp4", async (req, res) => {
  logger.debug("Video request from", req.useragent?.source);

  await convert(req.params.id, req.params.videoName, res);
})

// Short links (redd.it/abc123)
app.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^[a-z0-9]{6,8}$/i.test(id)) {
    return res.status(404).send("Not Found");
  }

  if (req.useragent?.isBot) {
    logger.debug("Reddit post request from", req.useragent?.source);
    renderRedditPost(id, res, !!req.query.audio);
  } else {
    res.redirect(`https://reddit.com/${id}`);
  }
});

const httpsCertPath = process.env.HTTPS_CERT_PATH;
if (httpsCertPath) {
  const keyPath = `${httpsCertPath}\\privkey.pem`;
  const certPath = `${httpsCertPath}\\fullchain.pem`;
  https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  }, app).listen(port, () => {
    logger.info(`HTTPS server listening on port ${port}`)
  })
} else {
  app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
}