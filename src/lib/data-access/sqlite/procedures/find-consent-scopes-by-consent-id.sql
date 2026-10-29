SELECT
    id,
    name,
    description,
    created_at,
    updated_at
FROM scopes
    JOIN consent_scopes ON consent_scopes.scope_id = scopes.id
WHERE
    consent_scopes.consent_id = $consent_id;