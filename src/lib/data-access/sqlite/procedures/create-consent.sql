INSERT INTO
    consents (id, client_id, user_id)
VALUES ($id, $client_id, $user_id) RETURNING *;