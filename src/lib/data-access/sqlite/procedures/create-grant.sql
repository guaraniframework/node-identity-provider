INSERT INTO
    grants (
        id,
        login_challenge,
        consent_challenge,
        parameters,
        client_id,
        session_id
    )
VALUES (
        $id,
        $login_challenge,
        $consent_challenge,
        $parameters,
        $client_id,
        $session_id
    ) RETURNING *;