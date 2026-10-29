CREATE TABLE IF NOT EXISTS user_addresses (
    id BLOB NOT NULL PRIMARY KEY,
    street_address TEXT NULL,
    locality TEXT NULL,
    region TEXT NULL,
    postal_code TEXT NULL,
    country TEXT NULL,
    user_id BLOB NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) STRICT;