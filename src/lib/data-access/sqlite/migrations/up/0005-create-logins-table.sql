CREATE TABLE IF NOT EXISTS logins (
    id BLOB NOT NULL PRIMARY KEY,
    amr TEXT,
    acr TEXT,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC,
    user_id BLOB NOT NULL,
    session_id BLOB NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
)