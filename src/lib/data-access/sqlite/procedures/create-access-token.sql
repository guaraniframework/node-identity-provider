INSERT INTO
    access_tokens (
        id,
        client_id,
        user_id,
        refresh_token_id
    )
VALUES (
        $id,
        $client_id,
        $user_id,
        $refresh_token_id
    ) RETURNING *;