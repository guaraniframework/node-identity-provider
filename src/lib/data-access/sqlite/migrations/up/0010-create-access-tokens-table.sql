CREATE TABLE IF NOT EXISTS access_tokens (
    id BLOB NOT NULL PRIMARY KEY,
    scopes TEXT NOT NULL,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC NOT NULL,
    revoked_at NUMERIC,
    valid_after NUMERIC NOT NULL,
    client_id BLOB NOT NULL,
    user_id BLOB,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
)