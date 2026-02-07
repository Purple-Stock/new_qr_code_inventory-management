ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_status TEXT;
ALTER TABLE teams ADD COLUMN stripe_price_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_current_period_end INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS index_teams_on_stripe_customer_id
  ON teams(stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS index_teams_on_stripe_subscription_id
  ON teams(stripe_subscription_id);
