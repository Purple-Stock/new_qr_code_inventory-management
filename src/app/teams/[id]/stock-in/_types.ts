import type { ItemDto } from "@/lib/services/types";

export type Item = Pick<ItemDto, "id" | "name" | "sku" | "barcode" | "currentStock" | "locationName">;

export interface Location {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
}

export interface SelectedItem {
  item: Item;
  quantity: number;
}
