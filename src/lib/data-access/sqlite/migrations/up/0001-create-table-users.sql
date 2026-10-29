CREATE TABLE IF NOT EXISTS users (
    id BLOB NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    given_name TEXT NOT NULL,
    middle_name TEXT NULL,
    family_name TEXT NOT NULL,
    nickname TEXT NULL,
    preferred_username TEXT NULL,
    profile TEXT NULL,
    picture TEXT NULL,
    website TEXT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
    gender TEXT NULL,
    birthdate TEXT NOT NULL,
    zoneinfo TEXT NULL,
    locale TEXT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    phone_number_verified INTEGER NOT NULL DEFAULT 0 CHECK (
        phone_number_verified IN (0, 1)
    ),
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
) STRICT;