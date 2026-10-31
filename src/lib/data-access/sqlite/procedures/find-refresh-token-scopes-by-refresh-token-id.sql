SELECT
    id,
    name,
    description,
    created_at,
    updated_at
FROM
    scopes
    JOIN refresh_token_scopes ON refresh_token_scopes.scope_id = scopes.id
WHERE
    refresh_token_scopes.refresh_token_id = $refresh_token_id;