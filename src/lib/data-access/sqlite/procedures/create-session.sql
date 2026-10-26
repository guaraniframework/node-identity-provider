INSERT INTO
    sessions (id, active_login_id, grant_id)
VALUES ($id, NULL, NULL) RETURNING *;