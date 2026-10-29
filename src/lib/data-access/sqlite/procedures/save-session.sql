UPDATE sessions
SET
    active_login_id = $active_login_id,
    grant_id = $grant_id
WHERE
    id = $id;