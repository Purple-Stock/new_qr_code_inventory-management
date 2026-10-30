-- WHY: items.current_stock + location_id is one slot. Prod Galpão Cadeira Azul
-- sits 12 at Local 1 and 8 at Local2 on the book while the row is tagged Local2 20.
-- item_stocks is the per-bin quantity. Keep items columns as a cached SUM / tag
-- so we can roll back without rewriting client rows.
CREATE TABLE IF NOT EXISTS item_stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 0.0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_item_stocks_on_item_id_and_location_id
  ON item_stocks(item_id, location_id);
CREATE INDEX IF NOT EXISTS index_item_stocks_on_location_id
  ON item_stocks(location_id);
