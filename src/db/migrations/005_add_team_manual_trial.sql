ALTER TABLE teams ADD COLUMN manual_trial_ends_at INTEGER;
ALTER TABLE teams ADD COLUMN manual_trial_grants_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN manual_trial_last_granted_at INTEGER;
