CREATE TABLE IF NOT EXISTS consents (
    id BLOB NOT NULL PRIMARY KEY,
    scopes TEXT NOT NULL,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC,
    client_id BLOB NOT NULL,
    user_id BLOB NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
)