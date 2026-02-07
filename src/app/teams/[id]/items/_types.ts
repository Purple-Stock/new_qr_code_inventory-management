import type { ItemDto } from "@/lib/services/types";
import type { TeamDto } from "@/lib/services/types";

export type Item = Pick<
  ItemDto,
  "id" | "name" | "sku" | "barcode" | "itemType" | "currentStock" | "price" | "locationName"
>;

export type Team = Pick<TeamDto, "id" | "name" | "itemCount" | "transactionCount">;
