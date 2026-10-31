UPDATE authorization_codes
SET
    revoked_at = (unixepoch('now'))
WHERE
    id = $id;