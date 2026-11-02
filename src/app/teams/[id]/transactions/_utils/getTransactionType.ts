export function isInterTeamTransfer(transaction: any): boolean {
  return (
    transaction?.destinationKind === "team" &&
    (transaction?.transactionType === "stock_in" ||
      transaction?.transactionType === "stock_out")
  );
}

export function getTransactionTypeLabel(
  type: string,
  t: any,
  transaction?: any
): string {
  if (transaction && isInterTeamTransfer(transaction)) {
    return t.transactions.interTeamTransfer || "Inter-team transfer";
  }

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

export function getTransactionTypeColor(type: string, transaction?: any): string {
  if (transaction && isInterTeamTransfer(transaction)) {
    return "bg-raised text-brand border-hairline";
  }

  switch (type) {
    case "stock_in":
      return "bg-raised text-positive border-hairline";
    case "stock_out":
      return "bg-raised text-negative border-hairline";
    default:
      return "bg-raised text-ink-2 border-hairline";
  }
}

export function formatQuantity(quantity: number, type: string): string {
  const sign = type === "stock_out" ? "-" : "+";
  return `${sign}${quantity.toFixed(1)}`;
}

export function formatLocation(transaction: any, t: any): string {
  if (transaction.destinationKind === "team" && transaction.counterpartyTeam?.name) {
    const teamName = transaction.counterpartyTeam.name;
    if (transaction.transactionType === "stock_out") {
      return `${t.transactions.toTeamPrefix || "To team"} ${teamName}`;
    }
    if (transaction.transactionType === "stock_in") {
      return `${t.transactions.fromTeamPrefix || "From team"} ${teamName}`;
    }
  }

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
