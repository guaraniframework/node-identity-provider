INSERT INTO
    refresh_tokens (
        id,
        client_id,
        user_id,
        login_id
    )
VALUES (
        $id,
        $client_id,
        $user_id,
        $login_id
    ) RETURNING *;