SELECT
    id,
    secret,
    created_at,
    expires_at
FROM client_secrets
WHERE
    client_id = $client_id;