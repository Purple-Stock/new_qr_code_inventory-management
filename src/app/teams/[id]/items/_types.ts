import type { ItemDto } from "@/lib/services/types";

export type Item = Pick<
  ItemDto,
  "id" | "name" | "sku" | "barcode" | "itemType" | "currentStock" | "price" | "locationName"
>;

export interface Team {
  id: number;
  name: string;
  itemCount: number;
  transactionCount: number;
}
