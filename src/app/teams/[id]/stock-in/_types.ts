import type { ItemDto, LocationDto, TeamDto } from "@/lib/services/types";

export type Item = Pick<ItemDto, "id" | "name" | "sku" | "barcode" | "currentStock" | "locationName">;

export type Location = Pick<LocationDto, "id" | "name">;

export type Team = TeamDto;

export interface SelectedItem {
  item: Item;
  quantity: number;
}
