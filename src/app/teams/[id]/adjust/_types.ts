import type { ItemDto } from "@/lib/services/types";
import type { LocationDto, TeamDto } from "@/lib/services/types";

export type Item = Pick<ItemDto, "id" | "name" | "sku" | "barcode" | "currentStock" | "locationName">;

export type Location = Pick<LocationDto, "id" | "name">;

export type Team = Pick<TeamDto, "id" | "name">;

export interface SelectedItem {
  item: Item;
  quantity: number;
}
