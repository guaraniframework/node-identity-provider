SELECT
    id,
    created_at,
    expires_at,
    client_id,
    user_id
FROM consents
WHERE
    id = $id;