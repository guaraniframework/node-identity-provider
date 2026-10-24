SELECT
    id,
    name,
    description,
    created_at,
    updated_at
FROM scopes
    JOIN client_scopes ON client_scopes.scope_id = scopes.id
WHERE
    client_scopes.client_id = $client_id;
