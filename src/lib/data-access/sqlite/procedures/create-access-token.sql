INSERT INTO
    access_tokens (id, client_id, user_id)
VALUES ($id, $client_id, $user_id) RETURNING *;