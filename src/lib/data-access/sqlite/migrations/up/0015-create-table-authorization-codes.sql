CREATE TABLE IF NOT EXISTS authorization_codes (
    id BLOB NOT NULL PRIMARY KEY,
    code_challenge TEXT NOT NULL UNIQUE,
    code_challenge_method TEXT NOT NULL CHECK (
        code_challenge_method IN ('S256', 'plain')
    ),
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    expires_at INTEGER NOT NULL DEFAULT (
        unixepoch('now', '+5 minutes')
    ),
    revoked_at INTEGER NULL,
    valid_after INTEGER NOT NULL DEFAULT (unixepoch('now')),
    login_id BLOB NOT NULL,
    consent_id BLOB NOT NULL,
    FOREIGN KEY (login_id) REFERENCES logins (id) ON DELETE CASCADE,
    FOREIGN KEY (consent_id) REFERENCES consents (id) ON DELETE CASCADE
) STRICT;