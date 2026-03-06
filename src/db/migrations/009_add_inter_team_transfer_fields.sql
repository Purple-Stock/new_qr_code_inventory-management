ALTER TABLE stock_transactions ADD COLUMN destination_kind TEXT;
ALTER TABLE stock_transactions ADD COLUMN destination_label TEXT;
ALTER TABLE stock_transactions ADD COLUMN counterparty_team_id INTEGER REFERENCES teams(id);
ALTER TABLE stock_transactions ADD COLUMN linked_transaction_id INTEGER;
ALTER TABLE stock_transactions ADD COLUMN transfer_group_id TEXT;

CREATE INDEX IF NOT EXISTS index_stock_transactions_on_counterparty_team_id
  ON stock_transactions(counterparty_team_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_transfer_group_id
  ON stock_transactions(transfer_group_id);
