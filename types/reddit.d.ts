interface TextFlair {
  e: "text";
  t: string;
}
interface EmojiFlair {
  e: "emoji";
  a: string;
  u: string;
}
type RichFlair = TextFlair | EmojiFlair;

interface MediaEmbed {
  content: string,
  width: number,
  height: number,
  scrolling: boolean,
}
interface ApiVideo {
  width: number,
  height: number,
  fallback_url: string,
  dash_url: string,
  hls_url: string,
  scrubber_media_url: string,
  duration: number,
  bitrate_kbps: number,
  is_gif: boolean,
  transcoding_status: string,
}
interface ApiImage {
  url: string;
  width: number;
  height: number;
}


export interface RedditPostData {
  all_awardings: never[]; // Awards no longer exist 🥲
  approved_at_utc: null | number;
  approved_by: null | string;
  archived: boolean;
  author: string;
  author_flair_background_color: string;
  author_flair_css_class: string;
  author_flair_richtext: { e: string; t: string }[];
  author_flair_template_id: null | string;
  author_flair_text: string;
  author_flair_text_color: string;
  author_flair_type: string;
  author_fullname: string;
  author_is_blocked: boolean;
  author_patreon_flair: boolean;
  author_premium: boolean;
  awarders: never[]; // Awards no longer exist 🥲
  banned_at_utc: null | number;
  banned_by: null | string;
  can_gild: boolean;
  can_mod_post: boolean;
  category: null | string;
  clicked: boolean;
  contest_mode: boolean;
  content_categories: null;
  created: number;
  created_utc: number;
  discussion_type: null | string;
  distinguished: null | string;
  domain: string;
  downs: number;
  edited: boolean;
  gilded: 0; // Gilding is the same as awards, so it no longer exists 🥲
  gildings: {}; // Gilding is the same as awards, so it no longer exists 🥲
  hide_score: boolean;
  hidden: boolean;
  id: string;
  is_created_from_ads_ui: boolean;
  is_crosspostable: boolean;
  is_meta: boolean;
  is_original_content: boolean;
  is_reddit_media_domain: boolean;
  is_robot_indexable: boolean;
  is_self: boolean;
  is_video: boolean;
  link_flair_background_color: string;
  link_flair_css_class: null | string;
  link_flair_richtext: RichFlair[];
  link_flair_text: null | string;
  link_flair_text_color: string;
  link_flair_type: string;
  likes: null;
  media: null;
  media_embed: MediaEmbed;
  media_only: boolean;
  mod_note: null | string;
  mod_reason_by: null | string;
  mod_reason_title: null | string;
  mod_reports: any[]; // TODO: Adjust this type based on the actual structure
  name: string;
  no_follow: boolean;
  num_comments: number;
  num_crossposts: number;
  num_reports: null | number;
  over_18: boolean;
  parent_whitelist_status: string;
  permalink: string;
  pinned: boolean;
  post_hint: string;
  preview: {
    images: {
      source: ApiImage;
      resolutions: ApiImage[];
      variants: {
        obfuscated?: {
          source: ApiImage;
          resolutions: ApiImage[];
        },
        nsfw?: {
          source: ApiImage;
          resolutions: ApiImage[];
        },
        gif?: {
          source: ApiImage;
          resolutions: ApiImage[];
        },
        mp4?: {
          source: ApiImage;
          resolutions: ApiImage[];
        }
      };
      id: string;
    }[];
    enabled: boolean;
  };
  pwls: number;
  quarantine: boolean;
  removal_reason: null | string;
  removed_by: null | string;
  removed_by_category: null | string;
  report_reasons: null | string;
  saved: boolean;
  score: number;
  secure_media: null;
  secure_media_embed: MediaEmbed | {
    reddit_video: ApiVideo,
  };
  selftext: string;
  selftext_html: string;
  send_replies: boolean;
  spoiler: boolean;
  stickied: boolean;
  subreddit: string;
  subreddit_id: string;
  subreddit_name_prefixed: string;
  subreddit_subscribers: number;
  subreddit_type: string;
  suggested_sort: null | string;
  thumbnail: string;
  thumbnail_height: null | number;
  thumbnail_width: null | number;
  title: string;
  top_awarded_type: null | string;
  treatment_tags: any[]; // TODO: Adjust this type based on the actual structure
  ups: number;
  upvote_ratio: number;
  url: string;
  user_reports: any[]; // TODO: Adjust this type based on the actual structure
  visited: boolean;
  view_count: null;
  whitelist_status: string;
  wls: number;
}

export interface RedditPostListing {
  kind: "Listing";
  data: {
    modhash: string;
    geo_filter: string;
    dist: number;
    children: {
      kind: "t3";
      data: RedditPostData;
    }[];
    after: any;
    before: any;
  };
}