-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'operator', 'viewer')),
  reset_password_token TEXT UNIQUE,
  reset_password_sent_at INTEGER,
  remember_created_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_reset_password_token ON users(reset_password_token);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  notes TEXT,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_teams_on_user_id ON teams(user_id);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  team_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS index_locations_on_team_id ON locations(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS index_locations_on_team_id_and_name ON locations(team_id, name);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sku TEXT,
  barcode TEXT,
  cost REAL,
  price REAL,
  item_type TEXT,
  brand TEXT,
  initial_quantity INTEGER DEFAULT 0,
  current_stock REAL DEFAULT 0.0,
  minimum_stock REAL DEFAULT 0.0,
  team_id INTEGER NOT NULL,
  location_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS index_items_on_sku ON items(sku);
CREATE INDEX IF NOT EXISTS index_items_on_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS index_items_on_team_id ON items(team_id);
CREATE INDEX IF NOT EXISTS index_items_on_location_id ON items(location_id);

-- Create stock_transactions table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjust', 'move', 'count')),
  quantity REAL NOT NULL,
  notes TEXT,
  user_id INTEGER NOT NULL,
  source_location_id INTEGER,
  destination_location_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_location_id) REFERENCES locations(id),
  FOREIGN KEY (destination_location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS index_stock_transactions_on_item_id ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_item_id_and_created_at ON stock_transactions(item_id, created_at);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_team_id ON stock_transactions(team_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_user_id ON stock_transactions(user_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_transaction_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_source_location_id ON stock_transactions(source_location_id);
CREATE INDEX IF NOT EXISTS index_stock_transactions_on_destination_location_id ON stock_transactions(destination_location_id);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_api_keys_on_token ON api_keys(token);
CREATE INDEX IF NOT EXISTS index_api_keys_on_user_id ON api_keys(user_id);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  event TEXT,
  secret TEXT,
  team_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS index_webhooks_on_team_id ON webhooks(team_id);
