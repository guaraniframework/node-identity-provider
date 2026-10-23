CREATE TABLE IF NOT EXISTS client_scopes (
    client_id BLOB NOT NULL,
    scope_id BLOB NOT NULL,
    PRIMARY KEY (client_id, scope_id),
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes (id) ON DELETE CASCADE
) STRICT;