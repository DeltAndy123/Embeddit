import express from "express";
import useragent from "express-useragent";
import axios, {AxiosResponse} from "axios";
import {RedditPostData, RedditPostListing} from "../types/reddit";

const port = 3000;

const app = express();
app.use(useragent.express());
app.set("view engine", "ejs");

function postToOptions(post: RedditPostData) {
  return {
    title: post.title,
    subreddit: post.subreddit_name_prefixed,
    score: post.score,
    hide_score: post.hide_score,
    upvote_ratio: post.upvote_ratio,
  }
}

// Reddit Posts
// Example:
// https://www.reddit.com/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/
// (or http://localhost:3000/r/discordapp/comments/7j4c2v/how_to_make_my_website_appear_in_discord_embeds/)
app.get("/r/:subreddit/comments/:id/:title", async (req, res) => {
  const { id } = req.params;
  axios.get(`https://api.reddit.com/api/info/?id=t3_${id}`)
      .then((response: AxiosResponse<RedditPostListing>) => {
        const post = response.data.data.children[0].data;
        switch (post.post_hint) {
          case "image":
            res.render("image", {
              ...postToOptions(post),
              image_url: post.url,
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal Server Error");
      });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});