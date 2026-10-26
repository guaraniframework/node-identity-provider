INSERT INTO
    authorization_codes (
        id,
        code_challenge,
        code_challenge_method,
        login_id,
        consent_id
    )
VALUES (
        $id,
        $code_challenge,
        $code_challenge_method,
        $login_id,
        $consent_id
    ) RETURNING *;