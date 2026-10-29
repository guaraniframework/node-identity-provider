CREATE TABLE IF NOT EXISTS client_secrets (
    id BLOB NOT NULL PRIMARY KEY,
    secret BLOB NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NOT NULL DEFAULT (unixepoch('now', '+1 year')),
    client_id BLOB NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) STRICT;