UPDATE access_tokens
SET
    revoked_at = (unixepoch('now'))
WHERE
    revoked_at IS NULL
    AND refresh_token_id = $refresh_token_id;