export interface Item {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  itemType: string | null;
  currentStock: number | null;
  price: number | null;
  locationName?: string | null;
}

export interface Team {
  id: number;
  name: string;
  itemCount: number;
  transactionCount: number;
}
