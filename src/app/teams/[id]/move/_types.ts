export interface Item {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  locationName?: string | null;
}

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
