CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BLOB NOT NULL PRIMARY KEY,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NOT NULL DEFAULT (unixepoch('now', '+30 days')),
    revoked_at INTEGER NULL,
    valid_after INTEGER NOT NULL DEFAULT (unixepoch('now')),
    client_id BLOB NOT NULL,
    user_id BLOB NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) STRICT;