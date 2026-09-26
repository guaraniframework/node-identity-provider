CREATE TABLE IF NOT EXISTS sessions (
    id BLOB NOT NULL PRIMARY KEY,
    active_login_id BLOB UNIQUE,
    grant_id BLOB UNIQUE,
    FOREIGN KEY (active_login_id) REFERENCES logins (id),
    FOREIGN KEY (grant_id) REFERENCES grants (id)
)