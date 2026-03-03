DROP INDEX IF EXISTS index_stock_transactions_on_transfer_group_id;
DROP INDEX IF EXISTS index_stock_transactions_on_counterparty_team_id;

ALTER TABLE stock_transactions DROP COLUMN transfer_group_id;
ALTER TABLE stock_transactions DROP COLUMN linked_transaction_id;
ALTER TABLE stock_transactions DROP COLUMN counterparty_team_id;
ALTER TABLE stock_transactions DROP COLUMN destination_label;
ALTER TABLE stock_transactions DROP COLUMN destination_kind;
