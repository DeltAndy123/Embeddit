import {
  type APIButtonComponentWithURL,
  type APIMediaGalleryComponent,
  type APISeparatorComponent,
  type APITextDisplayComponent,
  type APIThumbnailComponent,
  ButtonStyle,
  ComponentType,
  type SeparatorSpacingSize,
} from "discord-api-types/v10";
import type {
  EmbedActionRow,
  EmbedContainer,
  EmbedContainerChild,
  EmbedSection,
} from "@/types/discord";

export const container = (
  components: EmbedContainerChild[],
  opts: { accentColor?: number; spoiler?: boolean } = {},
): EmbedContainer => ({
  type: ComponentType.Container,
  components,
  ...(opts.accentColor !== undefined && { accent_color: opts.accentColor }),
  ...(opts.spoiler !== undefined && { spoiler: opts.spoiler }),
});

export const textDisplay = (content: string): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content,
});

export const section = (
  text: [string] | [string, string] | [string, string, string],
  accessory: EmbedSection["accessory"],
): EmbedSection => ({
  type: ComponentType.Section,
  components: text.map(textDisplay),
  accessory,
});

export const thumbnail = (
  url: string,
  opts: { description?: string; spoiler?: boolean } = {},
): APIThumbnailComponent => ({
  type: ComponentType.Thumbnail,
  media: { url },
  ...(opts.description !== undefined && { description: opts.description }),
  ...(opts.spoiler !== undefined && { spoiler: opts.spoiler }),
});

// Discord allows 10 gallery items across the whole embed (not per gallery)
export const MAX_GALLERY_ITEMS = 10;
// Thumbnails have their own separate limit of 10 per embed
export const MAX_THUMBNAILS = 10;
// Every component counts toward this, at any depth, including the container itself
export const MAX_TOTAL_COMPONENTS = 40;
// Size in bytes of the whole JSON payload as emitted in the script tag. Text,
// URLs, the JSON structure and escapes all count.
export const MAX_EMBED_SIZE = 3000;

export const mediaGallery = (
  items: { url: string; description?: string; spoiler?: boolean }[],
): APIMediaGalleryComponent => {
  if (items.length === 0) {
    throw new RangeError("A media gallery needs at least one item");
  }
  return {
    type: ComponentType.MediaGallery,
    // A single gallery can never exceed the embed-wide limit, so extras are dropped
    items: items
      .slice(0, MAX_GALLERY_ITEMS)
      .map(({ url, description, spoiler }) => ({
        media: { url },
        ...(description !== undefined && { description }),
        ...(spoiler !== undefined && { spoiler }),
      })),
  };
};

export const separator = (
  opts: { divider?: boolean; spacing?: SeparatorSpacingSize } = {},
): APISeparatorComponent => ({
  type: ComponentType.Separator,
  ...(opts.divider !== undefined && { divider: opts.divider }),
  ...(opts.spacing !== undefined && { spacing: opts.spacing }),
});

export const linkButton = (
  label: string,
  url: string,
  opts: { disabled?: boolean } = {},
): APIButtonComponentWithURL => ({
  type: ComponentType.Button,
  style: ButtonStyle.Link,
  label,
  url,
  ...(opts.disabled !== undefined && { disabled: opts.disabled }),
});

export const actionRow = (
  buttons: APIButtonComponentWithURL[],
): EmbedActionRow => ({
  type: ComponentType.ActionRow,
  components: buttons,
});
