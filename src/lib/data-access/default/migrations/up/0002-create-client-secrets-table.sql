CREATE TABLE IF NOT EXISTS client_secrets (
    secret BLOB NOT NULL PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    client_id BLOB NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
);