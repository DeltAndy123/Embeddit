import type {
  APIActionRowComponent, APIButtonComponentWithURL, APIContainerComponent,
  APIMediaGalleryComponent, APISectionComponent, APISeparatorComponent,
  APITextDisplayComponent, APIThumbnailComponent,
} from "discord-api-types/v10";

export type EmbedActionRow = APIActionRowComponent<APIButtonComponentWithURL>;

export type EmbedSection = Omit<APISectionComponent, "accessory"> & {
  accessory: APIButtonComponentWithURL | APIThumbnailComponent;
};

export type EmbedContainerChild =
  | EmbedActionRow
  | EmbedSection
  | APITextDisplayComponent
  | APIMediaGalleryComponent
  | APISeparatorComponent;

export type EmbedContainer = Omit<APIContainerComponent, "components"> & {
  components: EmbedContainerChild[];
};

export interface DiscordComponentEmbed {
  component: EmbedContainer;
}