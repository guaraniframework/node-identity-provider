CREATE TABLE IF NOT EXISTS logins_clients (
    login_id BLOB NOT NULL,
    client_id BLOB NOT NULL,
    PRIMARY KEY (login_id, client_id),
    FOREIGN KEY (login_id) REFERENCES logins (id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
)