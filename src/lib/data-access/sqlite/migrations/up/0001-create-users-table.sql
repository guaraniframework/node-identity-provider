CREATE TABLE IF NOT EXISTS users (
    id BLOB NOT NULL PRIMARY KEY,
    password TEXT NOT NULL,
    given_name TEXT NOT NULL,
    middle_name TEXT,
    family_name TEXT NOT NULL,
    picture TEXT,
    email TEXT NOT NULL UNIQUE,
    email_verified NUMERIC NOT NULL DEFAULT 0,
    gender TEXT,
    birthdate NUMERIC NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    phone_number_verified NUMERIC NOT NULL DEFAULT 0,
    address TEXT NOT NULL,
    created_at NUMERIC NOT NULL,
    updated_at NUMERIC NOT NULL,
    deleted_at NUMERIC
)