CREATE TABLE IF NOT EXISTS access_tokens (
    id BLOB NOT NULL PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'Bearer',
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NOT NULL DEFAULT (unixepoch('now', '+24 hours')),
    revoked_at INTEGER NULL,
    valid_after INTEGER NOT NULL DEFAULT (unixepoch('now')),
    client_id BLOB NOT NULL,
    user_id BLOB NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) STRICT;