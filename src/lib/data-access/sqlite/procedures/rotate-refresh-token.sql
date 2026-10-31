BEGIN TRANSACTION;

UPDATE refresh_tokens
SET
    revoked_at = unixepoch('now')
WHERE
    id = $old_refresh_token_id;

INSERT INTO
    refresh_tokens (
        id,
        expires_at,
        valid_after,
        client_id,
        user_id
    )
VALUES (
        $id,
        $expires_at,
        $valid_after,
        $client_id,
        $user_id
    );

COMMIT;