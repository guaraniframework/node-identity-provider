SELECT
    id,
    amr,
    acr,
    created_at,
    expires_at,
    user_id,
    session_id
FROM logins
WHERE
    id = $id;