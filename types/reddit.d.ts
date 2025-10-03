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
  bitrate_kbps: number,
  fallback_url: string,
  has_audio: boolean,
  height: number,
  width: number,
  scrubber_media_url: string,
  dash_url: string,
  duration: number,
  hls_url: string,
  is_gif: boolean,
  transcoding_status: string,
}
interface ApiImage {
  url: string;
  width: number;
  height: number;
}
interface ApiMediaMetadata { // Not actually metadata, basically same as ApiImage but with single char keys
  u: string; // URL
  x: number; // Width
  y: number; // Height
}


export interface RedditPostData {
  all_awardings: never[]; // Awards no longer exist 🥲
  approved_at_utc: null | number;
  approved_by: null | string;
  archived: boolean;
  author: string;
  author_flair_background_color: string;
  author_flair_css_class: string;
  author_flair_richtext: ({ a: string, e: string, u: string } | { e: string; t: string })[];
  author_flair_template_id: null | string;
  author_flair_text: string;
  author_flair_text_color: string;
  author_flair_type: null | string;
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
  media: null | {
    reddit_video: ApiVideo,
  };
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
  media_metadata?: {
    [key: string]: {
      status: "valid" | "invalid" | "deleted";
      e: "Image" | "AnimatedImage" | "Video";
      /** MIME type */
      m: string;
      p: ApiMediaMetadata[]; // Previews
      s: ApiMediaMetadata; // Source
      id: string;
    }
  }
  over_18: boolean;
  parent_whitelist_status: string;
  permalink: string;
  pinned: boolean;
  post_hint?: string;
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
  report_reasons: null | string[];
  saved: boolean;
  score: number;
  secure_media: {
    reddit_video: ApiVideo,
  };
  secure_media_embed: MediaEmbed | {
    reddit_video: ApiVideo,
  };
  selftext: string;
  selftext_html: string | null;
  send_replies: boolean;
  spoiler: boolean;
  stickied: boolean;
  subreddit: string;
  subreddit_id: string;
  subreddit_name_prefixed: string;
  subreddit_subscribers: number;
  subreddit_type: "public" | "private" | "restricted" | "gold_restricted" | "archived";
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
  user_reports: (null | number)[][];
  visited: boolean;
  view_count: null;
  whitelist_status: string;
  wls: number;
}

export interface RedditCommentData {
  subreddit_id: string;
  approved_at_utc: null | number;
  author_is_blocked: boolean;
  comment_type: null | string;
  edited: boolean;
  mod_reason_by: null | string;
  banned_by: null | string;
  ups: number;
  num_reports: null | number;
  author_flair_type: null | string;
  total_awards_received: number;
  subreddit: string;
  author_flair_template_id: null | string;
  likes: null | number;
  replies: string;
  user_reports: (null | number)[][];
  saved: boolean;
  id: string;
  banned_at_utc: null | number;
  mod_reason_title: null | string;
  gilded: number;
  archived: boolean;
  collapsed_reason_code: null | string;
  no_follow: boolean;
  author: string;
  can_mod_post: boolean;
  send_replies: boolean;
  parent_id: string;
  score: number;
  author_fullname: string;
  report_reasons: null | string[];
  removal_reason: null | string;
  approved_by: null | string;
  all_awardings: never[];
  body: string;
  awarders: never[];
  top_awarded_type: null | string;
  downs: 0; // Reddit doesn't tell us downvotes
  author_flair_css_class: null | string;
  author_patreon_flair: boolean;
  collapsed: boolean;
  author_flair_richtext: ({ a: string, e: string, u: string } | { e: string; t: string })[];
  is_submitter: boolean;
  body_html: string;
  gildings: {};
  collapsed_reason: null | string;
  associated_award: null | string;
  stickied: boolean;
  author_premium: boolean;
  can_gild: boolean;
  link_id: string;
  unrepliable_reason: null | string;
  author_flair_text_color: string;
  score_hidden: boolean;
  permalink: string;
  subreddit_type: "public" | "private" | "restricted" | "gold_restricted" | "archived";
  locked: boolean;
  name: string;
  created: number;
  author_flair_text: null | string;
  treatment_tags: any[]; // TODO: Adjust this type based on the actual structure
  created_utc: number;
  subreddit_name_prefixed: string;
  controversiality: number;
  author_flair_background_color: string;
  collapsed_because_crowd_control: null;
  mod_reports: any[]; // TODO: Adjust this type based on the actual structure
  mod_note: null | string;
  distinguished: null | string;
}

interface ActiveRedditUserData {
  is_suspended: false;

  is_employee: boolean;
  has_visited_new_profile: boolean;
  is_friend: boolean;
  pref_no_profanity: boolean;
  has_external_account: boolean;
  pref_geopopular: string;
  pref_show_trending: boolean;
  subreddit: {
    default_set: boolean;
    user_is_contributor: boolean;
    banner_img: string;
    allowed_media_in_comments: any[];
    user_is_banned: boolean;
    free_form_reports: boolean;
    community_icon: string | null;
    show_media: boolean;
    icon_color: string;
    user_is_muted: boolean | null;
    display_name: string;
    header_img: string | null;
    title: string;
    coins: number;
    previous_names: string[];
    over_18: boolean;
    icon_size: [number, number];
    primary_color: string;
    icon_img: string;
    description: string;
    submit_link_label: string;
    header_size: [number, number] | null;
    restrict_posting: boolean;
    restrict_commenting: boolean;
    subscribers: number;
    submit_text_label: string;
    is_default_icon: boolean;
    link_flair_position: string;
    display_name_prefixed: string;
    key_color: string;
    name: string;
    is_default_banner: boolean;
    url: string;
    quarantine: boolean;
    banner_size: [number, number] | null;
    user_is_moderator: boolean;
    accept_followers: boolean;
    public_description: string;
    link_flair_enabled: boolean;
    disable_contributor_requests: boolean;
    subreddit_type: "public" | "private" | "restricted" | "gold_restricted" | "archived";
    user_is_subscriber: boolean;
  };
  pref_show_presence: boolean;
  snoovatar_img: string;
  snoovatar_size: [number, number];
  gold_expiration: number | null;
  has_gold_subscription: boolean;
  is_sponsor: boolean;
  num_friends: number;
  features: {
    [key: string]: boolean | {
      owner: string;
      variant: string;
      experiment_id: number;
    };
  };
  can_edit_name: boolean;
  is_blocked: boolean;
  verified: boolean;
  new_modmail_exists: boolean;
  pref_autoplay: boolean;
  coins: number;
  has_paypal_subscription: boolean;
  has_subscribed_to_premium: boolean;
  id: string;
  can_create_subreddit: boolean;
  over_18: boolean;
  is_gold: boolean;
  is_mod: boolean;
  awarder_karma: number;
  suspension_expiration_utc: number | null;
  has_stripe_subscription: boolean;
  pref_video_autoplay: boolean;
  in_chat: boolean;
  has_android_subscription: boolean;
  in_redesign_beta: boolean;
  icon_img: string;
  has_mod_mail: boolean;
  pref_nightmode: boolean;
  awardee_karma: number;
  hide_from_robots: boolean;
  password_set: boolean;
  modhash: string;
  link_karma: number;
  force_password_reset: boolean;
  total_karma: number;
  inbox_count: number;
  pref_top_karma_subreddits: boolean;
  has_mail: boolean;
  pref_show_snoovatar: boolean;
  name: string;
  pref_clickgadget: number;
  created: number;
  has_verified_email: boolean;
  gold_creddits: number;
  created_utc: number;
  has_ios_subscription: boolean;
  pref_show_twitter: boolean;
  in_beta: boolean;
  comment_karma: number;
  accept_followers: boolean;
  has_subscribed: boolean;
}

interface SuspendedRedditUserData {
  is_suspended: true;

  name: string;
  awardee_karma: 0;
  awarder_karma: 0;
  is_blocked: boolean;
  total_karma: 0;
}

export type RedditUserData = ActiveRedditUserData | SuspendedRedditUserData;

export interface RedditSubredditData {
  user_flair_background_color: string | null;
  submit_text_html: string;
  restrict_posting: boolean;
  user_is_banned: boolean;
  free_form_reports: boolean;
  wiki_enabled: boolean | null;
  user_is_muted: boolean;
  user_can_flair_in_sr: boolean | null;
  display_name: string;
  header_img: string | null;
  title: string;
  allow_galleries: boolean;
  icon_size: number | null;
  primary_color: string;
  active_user_count: number;
  icon_img: string;
  display_name_prefixed: string;
  accounts_active: number;
  public_traffic: boolean;
  subscribers: number;
  user_flair_richtext: RichFlair[];
  videostream_links_count: number;
  name: string;
  quarantine: boolean;
  hide_ads: boolean;
  prediction_leaderboard_entry_type: number;
  emojis_enabled: boolean;
  advertiser_category: string;
  public_description: string;
  comment_score_hide_mins: number;
  allow_predictions: boolean;
  user_has_favorited: boolean;
  user_flair_template_id: string | null;
  community_icon: string;
  banner_background_image: string;
  original_content_tag_enabled: boolean;
  community_reviewed: boolean;
  submit_text: string;
  description_html: string;
  spoilers_enabled: boolean;
  comment_contribution_settings: {
    allowed_media_types: string[];
  };
  allow_talks: boolean;
  header_size: number | null;
  user_flair_position: string;
  all_original_content: boolean;
  has_menu_widget: boolean;
  is_enrolled_in_new_modmail: boolean | null;
  key_color: string;
  can_assign_user_flair: boolean;
  created: number;
  wls: number;
  show_media_preview: boolean;
  submission_type: string;
  user_is_subscriber: boolean;
  allowed_media_in_comments: string[];
  allow_videogifs: boolean;
  should_archive_posts: boolean;
  user_flair_type: string;
  allow_polls: boolean;
  collapse_deleted_comments: boolean;
  emojis_custom_size: number | null;
  public_description_html: string;
  allow_videos: boolean;
  is_crosspostable_subreddit: boolean;
  notification_level: string | null;
  should_show_media_in_comments_setting: boolean;
  can_assign_link_flair: boolean;
  accounts_active_is_fuzzed: boolean;
  allow_prediction_contributors: boolean;
  submit_text_label: string;
  link_flair_position: string;
  user_sr_flair_enabled: boolean;
  user_flair_enabled_in_sr: boolean;
  allow_discovery: boolean;
  accept_followers: boolean;
  user_sr_theme_enabled: boolean;
  link_flair_enabled: boolean;
  disable_contributor_requests: boolean;
  subreddit_type: "public" | "private" | "restricted" | "gold_restricted" | "archived";
  suggested_comment_sort: string | null;
  banner_img: string;
  user_flair_text: string | null;
  banner_background_color: string;
  show_media: boolean;
  id: string;
  user_is_moderator: boolean;
  over18: boolean;
  header_title: string;
  description: string;
  submit_link_label: string;
  user_flair_text_color: string | null;
  restrict_commenting: boolean;
  user_flair_css_class: string | null;
  allow_images: boolean;
  lang: string;
  url: string;
  created_utc: number;
  banner_size: [number, number];
  mobile_banner_image: string;
  user_is_contributor: boolean;
  allow_predictions_tournament: boolean;
}

export interface CommentChild {
  kind: "t1";
  data: RedditCommentData;
}
export interface UserChild {
  kind: "t2";
  data: RedditUserData;
}
export interface PostChild {
  kind: "t3";
  data: RedditPostData;
}
export interface SubredditChild {
  kind: "t5";
  data: RedditSubredditData;
}

export interface RedditPostListing {
  kind: "Listing";
  data: {
    modhash: string;
    geo_filter: string;
    dist: number;
    children: PostChild[];
    before: string;
    after: string;
  };
}

export interface RedditCommentListing {
  kind: "Listing";
  data: {
    modhash: string;
    geo_filter: string;
    dist: number;
    children: CommentChild[];
    before: string;
    after: string;
  }
}

type AnyChild = CommentChild | UserChild | PostChild | SubredditChild;

export interface RedditAnyListing {
  kind: "Listing";
  data: {
    modhash: string;
    geo_filter: string;
    dist: number;
    children: AnyChild[];
    before: string;
    after: string;
  }
}