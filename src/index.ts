import express from "express";
import useragent from "express-useragent";
import axios, {AxiosResponse} from "axios";
import {RedditPostData, RedditPostListing} from "../types/reddit";
import {getStatuses} from "./richembed";
import {oauthClient} from "./db";
import {SERVER_BASE, USER_AGENT} from "./consts";

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
  console.log("Reddit post request from", req.useragent?.source);

  const { id } = req.params;
  axios.get(`https://oauth.reddit.com/api/info/?id=t3_${id}&raw_json=1`, {
      headers: {
        "Authorization": "Bearer " + await oauthClient.getAccessToken(),
        "User-Agent": USER_AGENT
      }
    })
      .then((response: AxiosResponse<RedditPostListing>) => {
        const post = response.data.data.children[0].data;
        res.render("embed", {
          ...postToOptions(post),
          image_url: post.url,
          server_base: SERVER_BASE
        });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal Server Error");
      });
});

// Spoof as a Mastodon post so Discord allows rich embeds instead of normal links
// http://localhost:3000/users/TeamCherryGames/statuses/66086667665361575960535460605659595556555558585966
app.get("/users/:username/statuses/:id", async (req, res) => {
  console.log("Mastodon spoof request from", req.useragent?.source);

  // TODO: Redirect to real URL
  res.redirect("https://google.com");
});
// Discord will see above link and use /api/v1/statuses/66086667665361575960535460605659595556555558585966
// to fetch the post data, so handle that
app.get("/api/v1/statuses/:id", async (req, res) => {
  console.log("Mastodon API request from", req.useragent?.source);

  getStatuses(req, res);
});

app.get("/sample", (req, res) => {
  res.sendFile("sample_fxtwitter.html", { root: __dirname });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});