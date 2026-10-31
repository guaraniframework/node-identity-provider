INSERT INTO
    authorization_codes (
        id,
        parameters,
        login_id,
        consent_id
    )
VALUES (
        $id,
        $parameters,
        $login_id,
        $consent_id
    ) RETURNING *;