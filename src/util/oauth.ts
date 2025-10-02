import axios, { AxiosResponse } from "axios";
import { logger } from "./log";

export class OAuthClient {
  public readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken?: string;
  private tokenExpireTime?: number;

  public constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  public async getAccessToken() {
    if (this.accessToken && this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    return await this.generateAccessToken();
  }

  private get authToken() {
    return btoa(this.clientId + ":" + this.clientSecret)
  }

  private async generateAccessToken() {
    // TODO: Add data validation
    const response: AxiosResponse<RedditOAuthResponse> = await axios.post("https://www.reddit.com/api/v1/access_token", new URLSearchParams({
      grant_type: "client_credentials"
    }), {
      headers: {
        "Authorization": "Basic " + this.authToken,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;
    this.accessToken = response.data.access_token;

    logger.info("Refreshed access token, expires at " + new Date(this.tokenExpireTime).toISOString())

    return this.accessToken;
  }
}