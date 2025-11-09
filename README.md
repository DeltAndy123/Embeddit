# Embeddit
Better and rich Reddit embeds for Discord

## Comparison
### Supported Content Types
|                              | Embeddit (embeddit.deltandy.me)  | [FixReddit (rxddit.com)](https://github.com/MinnDevelopment/fxreddit) | [vxReddit (vxreddit.com)](https://github.com/dylanpdx/vxReddit) | [s/e/xy Reddit (rxyddit.com)](https://github.com/NurMarvin/sexy-reddit) | Default (reddit.com)                    |
|------------------------------|----------------------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------|-------------------------------------------------------------------------|-----------------------------------------|
| Embed text posts             | ✅                               | ✅                                                                   | ✅                                                              | ✅                                                                      | ⚠️ (Only beginning shown in an image)   |
| Embed image posts            | ✅                               | ✅                                                                   | ✅                                                              | ✅                                                                      | ⚠️ (Extra overlay added)                |
| Embed multiple images        | ✅                               | ✅                                                                   | ✅ (Also displays image count)                                  | ❌ (No images are displayed)                                            | ❌ (Only displays first)                |
| Embed videos                 | ✅                               | ✅                                                                   | ✅                                                              | ❌                                                                      | ❌                                      |
| Embed audio in videos        | ✅ (Add `?audio=1`)              | ⚠️ (May sometimes not work)                                          | ✅                                                              | ❌                                                                      | ❌                                      |
| Display link in link posts   | ✅                               | ❌                                                                   | ⚠️ (Link is only displayed in plain text)                       | ❌ (Embed does not show at all)                                         | ❌                                      |
| Embed polls                  | ❌                               | ✅                                                                   | ❌                                                              | ❌                                                                      | ❌                                      |
| Embed crossposts             | ⚠️ (Does not indicate crosspost) | ⚠️ (Does not indicate crosspost)                                     | ⚠️ (Does not indicate crosspost)                                | ❌                                                                      | ⚠️ (Only title and metrics, no content) |
| Embed comments               | ✅ (Also displays post contents) | ✅ (Also displays post contents)                                     | ✅                                                              | ❌                                                                      | ⚠️ (Only beginning shown in an image)   |
| Embed user profiles          | ❌                               | ⚠️ (Displays default Reddit embed)                                   | ❌                                                              | ❌                                                                      | ✅ (Displays karma and profile picture) |
| Embed subreddits             | ✅ (Also displays member count)  | ⚠️ (Displays default Reddit embed)                                   | ❌                                                              | ❌                                                                      | ✅                                      |


### Supported Post URL Formats
|                                       | Embeddit (embeddit.deltandy.me)  | [FixReddit (rxddit.com)](https://github.com/MinnDevelopment/fxreddit) | [vxReddit (vxreddit.com)](https://github.com/dylanpdx/vxReddit) | [s/e/xy Reddit (rxyddit.com)](https://github.com/NurMarvin/sexy-reddit) | Default (reddit.com) |
|---------------------------------------|----------------------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------|-------------------------------------------------------------------------|----------------------|
| Regular (`/r/{sub}/comments/abc123`)  | ✅                               | ✅                                                                   | ✅                                                              | ✅                                                                      | ✅                   |
| Share (`/r/{sub}/s/abcde12345`)       | ✅                               | ✅                                                                   | ✅                                                              | ❌                                                                      | ✅                   |
| Short (`redd.it/abc123`)              | ✅                               | ✅                                                                   | ❌                                                              | ❌                                                                      | ✅                   |
| Gallery (`/gallery/abc123`)           | ✅                               | ✅                                                                   | ✅                                                              | ❌                                                                      | ✅                   |
| User (`/user/{user}/comments/abc123`) | ✅                               | ✅                                                                   | ✅                                                              | ❌                                                                      | ✅                   |


### Information in Embeds
|                              | Embeddit (embeddit.deltandy.me)  | [FixReddit (rxddit.com)](https://github.com/MinnDevelopment/fxreddit) | [vxReddit (vxreddit.com)](https://github.com/dylanpdx/vxReddit) | [s/e/xy Reddit (rxyddit.com)](https://github.com/NurMarvin/sexy-reddit) | Default (reddit.com)                    |
|------------------------------|----------------------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------|-------------------------------------------------------------------------|-----------------------------------------|
| Rich Markdown text           | ✅                               | ❌                                                                   | ❌                                                              | ❌                                                                      | ❌                                      |
| Post metrics (upvotes, etc)  | ✅ (Formatted)                   | ❌                                                                   | ✅                                                              | ✅                                                                      | ✅ (Overlaid on image, formatted)       |
| Subreddit icon               | ✅                               | ❌                                                                   | ❌                                                              | ❌                                                                      | ✅                                      |


## Usage
### Main Instance
Replace `https://reddit.com` with `https://embeddit.deltandy.me` in your links in Discord

**Example**:
- Original: https://www.reddit.com/r/discordapp/comments/1nwg7ny/bug_megathread_vol_11_october_november/
- New: https://embeddit.deltandy.me/r/discordapp/comments/1nwg7ny/bug_megathread_vol_11_october_november/

To embed videos with audio, add `?audio=1` to the end of the link

**Example**:
- Original: https://www.reddit.com/r/wallstreetbets/comments/l8rf4k/times_square_right_now/
- New: https://embeddit.deltandy.me/r/wallstreetbets/comments/l8rf4k/times_square_right_now/?audio=1

### Self-Hosting
**Requirements:**
- Ability to port forward
    - Domain, HTTPS certificate, and ability to forward port 443 if using video/audio merging
- Reddit client ID and client (optional but recommended)
    - To obtain, go to https://www.reddit.com/prefs/apps, select "create another app," choose "script," and input anything for everything else
- Node.js/Bun

**Instructions:**
1. Clone this repository
```bash
git clone https://github.com/DeltAndy123/Embeddit
```
2. Install dependencies
```bash
bun install
```
3. Add environment variables (use `.env` file or any other method)
```conf
# Server base URL (must be public so it can be accessed by Discord)
SERVER_BASE=""

# Reddit OAuth credentials
# DONT_USE_OAUTH=0 # Use this if you don't want to use OAuth (not recommended for production)
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""

# Other
# DEBUG=0 # Set this to 1 to log requests and other debug messages
# PORT=3000 # Set this to 443 and set HTTPS_CERT_PATH if using video/audio merging
# HTTPS_CERT_PATH="" # Set this to a directory that contains privkey.pem and fullchain.pem for HTTPS (needed for video/audio merging)
# CACHE_MAX_ENTRIES=10000 # The number of share links to store as cache so it doesn't need to be re-fetched
```
3. Compile
```bash
bun run build
```
4. Run
```bash
bun run start
```
5. Follow same steps as for main instance, but replace `embeddit.deltandy.me` with your own server domain

## Credits
- [FxEmbed (FxTwitter, FxBsky)](https://github.com/FxEmbed/FxEmbed) - Mastodon embed method for larger character count and rich text formatting
- [FixReddit](https://github.com/MinnDevelopment/fxreddit), [vxReddit](https://github.com/dylanpdx/vxReddit), [s/e/xy Reddit](https://github.com/NurMarvin/sexy-reddit) - Other services that inspired this one