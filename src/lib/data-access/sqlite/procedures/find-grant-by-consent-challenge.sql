SELECT
    id,
    login_challenge,
    consent_challenge,
    parameters,
    interactions,
    created_at,
    expires_at,
    client_id,
    session_id,
    consent_id
FROM grants
WHERE
    consent_challenge = $consent_challenge;