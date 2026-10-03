CREATE TABLE IF NOT EXISTS users (
    id BLOB NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    given_name TEXT NOT NULL,
    middle_name TEXT,
    family_name TEXT NOT NULL,
    picture TEXT,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL,
    gender TEXT,
    birthdate TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    phone_number_verified INTEGER NOT NULL,
    address TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);