SELECT
    id,
    name,
    description,
    created_at,
    updated_at
FROM scopes
    JOIN access_token_scopes ON access_token_scopes.scope_id = scopes.id
WHERE
    access_token_scopes.access_token_id = $access_token_id;