CREATE TABLE IF NOT EXISTS client_secrets (
    secret TEXT NOT NULL PRIMARY KEY,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC NOT NULL,
    client_id BLOB NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
)