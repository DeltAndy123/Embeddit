import { ComponentType } from "discord-api-types/v10";
import {
  MAX_EMBED_SIZE,
  MAX_GALLERY_ITEMS,
  MAX_THUMBNAILS,
  MAX_TOTAL_COMPONENTS,
} from "@/embed/components";
import { embedSize } from "@/embed/serialize";
import { textContents } from "@/embed/walk";
import type { DiscordComponentEmbed } from "@/types/discord";

export class EmbedValidationError extends Error {
  override name = "EmbedValidationError";
}

export const countGalleryItems = (embed: DiscordComponentEmbed): number =>
  embed.component.components.reduce(
    (total, child) =>
      child.type === ComponentType.MediaGallery
        ? total + child.items.length
        : total,
    0,
  );

export const countThumbnails = (embed: DiscordComponentEmbed): number =>
  embed.component.components.reduce(
    (total, child) =>
      child.type === ComponentType.Section &&
      child.accessory.type === ComponentType.Thumbnail
        ? total + 1
        : total,
    0,
  );

// Counts every component in the tree (the container, sections with their text and
// accessory, action rows with their buttons). Gallery items are not components.
export const countComponents = (embed: DiscordComponentEmbed): number =>
  embed.component.components.reduce((total, child) => {
    switch (child.type) {
      case ComponentType.Section:
        return total + 1 + child.components.length + 1;
      case ComponentType.ActionRow:
        return total + 1 + child.components.length;
      default:
        return total + 1;
    }
  }, 1);

// Gallery items and thumbnails are limited separately, so an embed can hold 10 of each
export const assertValidEmbed = (embed: DiscordComponentEmbed): void => {
  const galleryItems = countGalleryItems(embed);
  if (galleryItems > MAX_GALLERY_ITEMS) {
    throw new EmbedValidationError(
      `Embed has ${galleryItems} gallery items across all galleries, the limit is ${MAX_GALLERY_ITEMS}`,
    );
  }

  const components = countComponents(embed);
  if (components > MAX_TOTAL_COMPONENTS) {
    throw new EmbedValidationError(
      `Embed has ${components} components in total, the limit is ${MAX_TOTAL_COMPONENTS}`,
    );
  }

  const thumbnails = countThumbnails(embed);
  if (thumbnails > MAX_THUMBNAILS) {
    throw new EmbedValidationError(
      `Embed has ${thumbnails} thumbnails, the limit is ${MAX_THUMBNAILS}`,
    );
  }

  const size = embedSize(embed);
  if (size > MAX_EMBED_SIZE) {
    throw new EmbedValidationError(
      `Embed payload is ${size} bytes, the limit is ${MAX_EMBED_SIZE}`,
    );
  }

  // Reddit returns "" for unset text (e.g. an image post's selftext), so builders
  // must leave those out instead of passing them through
  if (textContents(embed).some((text) => text.trim().length === 0)) {
    throw new EmbedValidationError("Embed has an empty text display");
  }
};
