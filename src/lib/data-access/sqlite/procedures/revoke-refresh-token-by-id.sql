UPDATE refresh_tokens
SET
    revoked_at = (unixepoch('now'))
WHERE
    id = $id;