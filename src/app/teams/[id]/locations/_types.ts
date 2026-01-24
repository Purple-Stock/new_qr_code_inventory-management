export interface Location {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | number;
  updatedAt: Date | number;
}

export interface Team {
  id: number;
  name: string;
  itemCount: number;
  transactionCount: number;
}
