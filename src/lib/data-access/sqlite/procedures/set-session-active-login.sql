UPDATE sessions
SET
    active_login_id = $active_login_id
WHERE
    id = $id;