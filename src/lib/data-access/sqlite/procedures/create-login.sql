INSERT INTO
    logins (
        id,
        amr,
        acr,
        user_id,
        session_id
    )
VALUES (
        $id,
        $amr,
        $acr,
        $user_id,
        $session_id
    ) RETURNING *;