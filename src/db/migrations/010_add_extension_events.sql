CREATE TABLE IF NOT EXISTS extension_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  anonymous_id TEXT,
  source TEXT NOT NULL DEFAULT 'chrome_extension',
  user_id INTEGER REFERENCES users(id),
  team_id INTEGER REFERENCES teams(id),
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS index_extension_events_on_event_name
  ON extension_events(event_name);
CREATE INDEX IF NOT EXISTS index_extension_events_on_anonymous_id
  ON extension_events(anonymous_id);
CREATE INDEX IF NOT EXISTS index_extension_events_on_user_id
  ON extension_events(user_id);
CREATE INDEX IF NOT EXISTS index_extension_events_on_team_id
  ON extension_events(team_id);
CREATE INDEX IF NOT EXISTS index_extension_events_on_created_at
  ON extension_events(created_at);
