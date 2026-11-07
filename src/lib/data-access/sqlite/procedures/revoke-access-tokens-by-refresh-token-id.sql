UPDATE access_tokens
SET
    revoked_at = (unixepoch('now'))
WHERE
    refresh_token_id = $refresh_token_id;