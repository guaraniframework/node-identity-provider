CREATE TABLE IF NOT EXISTS scopes (
    id BLOB NOT NULL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
) STRICT;