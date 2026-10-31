SELECT
    id,
    parameters,
    created_at,
    expires_at,
    revoked_at,
    valid_after,
    login_id,
    consent_id
FROM authorization_codes
WHERE
    id = $id;