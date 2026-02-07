DROP INDEX IF EXISTS index_teams_on_stripe_subscription_id;
DROP INDEX IF EXISTS index_teams_on_stripe_customer_id;

ALTER TABLE teams DROP COLUMN stripe_current_period_end;
ALTER TABLE teams DROP COLUMN stripe_price_id;
ALTER TABLE teams DROP COLUMN stripe_subscription_status;
ALTER TABLE teams DROP COLUMN stripe_subscription_id;
ALTER TABLE teams DROP COLUMN stripe_customer_id;
