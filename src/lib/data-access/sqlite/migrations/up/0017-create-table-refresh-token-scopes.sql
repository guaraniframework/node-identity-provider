CREATE TABLE IF NOT EXISTS refresh_token_scopes (
    refresh_token_id BLOB NOT NULL,
    scope_id BLOB NOT NULL,
    PRIMARY KEY (refresh_token_id, scope_id),
    FOREIGN KEY (refresh_token_id) REFERENCES refresh_tokens (id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes (id) ON DELETE CASCADE
) STRICT;