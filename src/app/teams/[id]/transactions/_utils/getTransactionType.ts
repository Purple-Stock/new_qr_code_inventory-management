export function getTransactionTypeLabel(type: string, t: any): string {
  switch (type) {
    case "stock_in":
      return t.transactions.stockIn;
    case "stock_out":
      return t.transactions.stockOut;
    case "adjust":
      return t.transactions.adjust;
    case "move":
      return t.transactions.move;
    case "count":
      return t.transactions.count;
    default:
      return type;
  }
}

export function getTransactionTypeColor(type: string): string {
  switch (type) {
    case "stock_in":
      return "bg-green-100 text-green-800 border-green-200";
    case "stock_out":
      return "bg-red-100 text-red-800 border-red-200";
    case "adjust":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "move":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function formatQuantity(quantity: number, type: string): string {
  const sign = type === "stock_out" ? "-" : "+";
  return `${sign}${quantity.toFixed(1)}`;
}

export function formatLocation(transaction: any, t: any): string {
  if (transaction.transactionType === "move") {
    const source = transaction.sourceLocation?.name || t.transactions.defaultLocation;
    const dest = transaction.destinationLocation?.name || t.transactions.defaultLocation;
    return `${source} → ${dest}`;
  }
  return (
    transaction.destinationLocation?.name ||
    transaction.sourceLocation?.name ||
    t.transactions.defaultLocation
  );
}
