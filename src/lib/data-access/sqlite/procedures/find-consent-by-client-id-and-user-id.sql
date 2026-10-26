SELECT
    id,
    created_at,
    expires_at,
    client_id,
    user_id
FROM consents
WHERE
    client_id = $client_id
    AND user_id = $user_id;