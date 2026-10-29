CREATE TABLE IF NOT EXISTS grants (
    id BLOB NOT NULL PRIMARY KEY,
    login_challenge TEXT NOT NULL UNIQUE,
    consent_challenge TEXT NOT NULL UNIQUE,
    parameters TEXT NOT NULL,
    interactions TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NOT NULL DEFAULT (
        unixepoch('now', '+5 minutes')
    ),
    client_id BLOB NOT NULL,
    session_id BLOB NOT NULL,
    consent_id BLOB NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (consent_id) REFERENCES consents (id) ON DELETE SET NULL
) STRICT;