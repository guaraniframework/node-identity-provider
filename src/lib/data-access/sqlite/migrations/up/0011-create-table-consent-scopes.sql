CREATE TABLE IF NOT EXISTS consent_scopes (
    consent_id BLOB NOT NULL,
    scope_id BLOB NOT NULL,
    PRIMARY KEY (consent_id, scope_id),
    FOREIGN KEY (consent_id) REFERENCES consents (id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes (id) ON DELETE CASCADE
) STRICT;