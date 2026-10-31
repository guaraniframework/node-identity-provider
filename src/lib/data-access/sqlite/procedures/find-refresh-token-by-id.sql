SELECT
    id,
    created_at,
    expires_at,
    revoked_at,
    valid_after,
    client_id,
    user_id
FROM refresh_tokens
WHERE
    id = $id;