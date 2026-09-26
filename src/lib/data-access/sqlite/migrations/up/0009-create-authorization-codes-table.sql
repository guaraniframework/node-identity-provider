CREATE TABLE IF NOT EXISTS authorization_codes (
    id BLOB NOT NULL PRIMARY KEY,
    parameters TEXT NOT NULL,
    created_at NUMERIC NOT NULL,
    expires_at NUMERIC NOT NULL,
    revoked_at NUMERIC,
    valid_after NUMERIC NOT NULL,
    login_id BLOB NOT NULL,
    consent_id BLOB NOT NULL,
    FOREIGN KEY (login_id) REFERENCES logins (id) ON DELETE CASCADE,
    FOREIGN KEY (consent_id) REFERENCES consents (id) ON DELETE CASCADE
)