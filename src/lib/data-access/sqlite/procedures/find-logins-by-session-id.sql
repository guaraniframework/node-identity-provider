SELECT
    id,
    amr,
    acr,
    created_at,
    expires_at,
    user_id
FROM logins
WHERE
    session_id = $session_id;
