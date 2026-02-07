import type { Item } from "../_types";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function itemsToCsv(
  items: Item[],
  headers: { name: string; sku: string; barcode: string; type: string; stock: string; price: string; location: string }
): string {
  const rows: string[] = [];

  const headerRow = [
    escapeCsvField(headers.name),
    escapeCsvField(headers.sku),
    escapeCsvField(headers.barcode),
    escapeCsvField(headers.type),
    escapeCsvField(headers.stock),
    escapeCsvField(headers.price),
    escapeCsvField(headers.location),
  ].join(",");
  rows.push(headerRow);

  for (const item of items) {
    const row = [
      escapeCsvField(item.name),
      escapeCsvField(item.sku),
      escapeCsvField(item.barcode),
      escapeCsvField(item.itemType),
      escapeCsvField(item.currentStock ?? ""),
      item.price != null ? escapeCsvField(item.price) : "",
      escapeCsvField(item.locationName ?? ""),
    ].join(",");
    rows.push(row);
  }

  return rows.join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
