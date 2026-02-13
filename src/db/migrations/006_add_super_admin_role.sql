CREATE TABLE IF NOT EXISTS super_admin_users (
  user_id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_super_admin_users_on_user_id ON super_admin_users(user_id);
