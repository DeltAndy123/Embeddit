import express from "express";
import useragent from "express-useragent";
import { RedditPostData, RedditPostListing } from "../types/reddit";
import { getStatuses } from "./richEmbed";
import { SERVER_BASE } from "./consts";
import { getRedditData, resolveShareLink } from "./util/api";
import { AxiosResponse } from "axios";
import { logger } from "./util/log";

const port = process.env.PORT || 3000;

const app = express();
app.use(useragent.express());
app.use(express.static("public"));
app.set("view engine", "ejs");

function postToOptions(post: RedditPostData) {
  return {
    permalink: `https://reddit.com${post.permalink}`,
    title: post.title,
    subreddit: post.subreddit_name_prefixed,
    author: post.author,
    score: post.score,
    hide_score: post.hide_score,
    upvote_ratio: post.upvote_ratio,
    description: post.selftext,
    postId: post.id
  }
}

// Reddit Posts
// Example:
// https://www.reddit.com/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/
// (or http://localhost:3000/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/)
app.get("/r/:subreddit/comments/:id/:title", async (req, res) => {
  if (req.useragent?.isBot) {
    logger.debug("Reddit post request from", req.useragent?.source);

    const { id } = req.params;
    getRedditData(`/api/info/?id=t3_${id}&raw_json=1`)
        .then((response: AxiosResponse<RedditPostListing>) => {
          const post = response.data.data.children[0].data;
          res.render("embed", {
            ...postToOptions(post),
            image_url: post.url,
            server_base: SERVER_BASE
          });
        })
        .catch((error) => {
          logger.error("Failed to fetch Reddit post data:", error);
          res.status(500).send("Internal Server Error");
        });
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
        .then((url) => {
          if (!url) {
            res.status(404).send("Not Found");
            return;
          }
          const postId = new URL(url).pathname.split("/")[4];
          // Use same logic as above
          getRedditData(`/api/info/?id=t3_${postId}&raw_json=1`)
              .then((response: AxiosResponse<RedditPostListing>) => {
                const post = response.data.data.children[0].data;
                res.render("embed", {
                  ...postToOptions(post),
                  image_url: post.url,
                  server_base: SERVER_BASE
                });
              })
              .catch((error) => {
                logger.error("Failed to fetch Reddit post data:", error);
                res.status(500).send("Internal Server Error");
              });
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

app.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});