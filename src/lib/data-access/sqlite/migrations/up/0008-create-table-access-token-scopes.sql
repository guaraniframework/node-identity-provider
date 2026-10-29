CREATE TABLE IF NOT EXISTS access_token_scopes (
    access_token_id BLOB NOT NULL,
    scope_id BLOB NOT NULL,
    PRIMARY KEY (access_token_id, scope_id),
    FOREIGN KEY (access_token_id) REFERENCES access_tokens (id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes (id) ON DELETE CASCADE
) STRICT;