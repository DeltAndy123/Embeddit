import { ComponentType } from "discord-api-types/v10";
import type { DiscordComponentEmbed } from "@/types/discord";

// Read-only views of an embed's contents, independent of how it is laid out.
// Used by the validator and by builder tests so they don't depend on child order.

/** Content of every text display, including those inside sections, in order */
export const textContents = (embed: DiscordComponentEmbed): string[] =>
  embed.component.components.flatMap((child) => {
    switch (child.type) {
      case ComponentType.TextDisplay:
        return [child.content];
      case ComponentType.Section:
        return child.components.map((text) => text.content);
      default:
        return [];
    }
  });

/** URL of every section thumbnail, in order */
export const thumbnailUrls = (embed: DiscordComponentEmbed): string[] =>
  embed.component.components.flatMap((child) =>
    child.type === ComponentType.Section &&
    child.accessory.type === ComponentType.Thumbnail
      ? [child.accessory.media.url]
      : [],
  );

/** URL of every link button, in action rows and as section accessories */
export const buttonUrls = (embed: DiscordComponentEmbed): string[] =>
  embed.component.components.flatMap((child) => {
    switch (child.type) {
      case ComponentType.ActionRow:
        return child.components.map((button) => button.url);
      case ComponentType.Section:
        return child.accessory.type === ComponentType.Button
          ? [child.accessory.url]
          : [];
      default:
        return [];
    }
  });
