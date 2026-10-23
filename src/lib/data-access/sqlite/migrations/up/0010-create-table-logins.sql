CREATE TABLE IF NOT EXISTS logins (
    id BLOB NOT NULL PRIMARY KEY,
    amr TEXT NOT NULL DEFAULT '[]',
    acr TEXT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NULL,
    user_id BLOB NOT NULL,
    session_id BLOB NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
) STRICT;