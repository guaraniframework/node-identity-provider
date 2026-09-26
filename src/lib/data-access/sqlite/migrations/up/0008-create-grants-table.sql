CREATE TABLE IF NOT EXISTS grants (
    id BLOB NOT NULL PRIMARY KEY,
    login_challenge BLOB NOT NULL UNIQUE,
    consent_challenge BLOB NOT NULL UNIQUE,
    parameters TEXT NOT NULL,
    interactions TEXT NOT NULL,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC NOT NULL,
    client_id BLOB NOT NULL,
    session_id BLOB NOT NULL,
    consent_id BLOB,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (consent_id) REFERENCES consents (id) ON DELETE CASCADE
)