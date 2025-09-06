import axios from "axios";
import { oauth } from "./db";
import { USER_AGENT } from "./consts";

export async function getRedditData(endpoint: string) {
  if (oauth.enabled && oauth.client) {
    return await axios.get(`https://oauth.reddit.com${endpoint}`, {
      headers: {
        "Authorization": "Bearer " + await oauth.client.getAccessToken(),
        "User-Agent": USER_AGENT
      }
    })
  } else {
    return await axios.get(`https://api.reddit.com${endpoint}`, {
      headers: {
        "User-Agent": USER_AGENT
      }
    })
  }
}